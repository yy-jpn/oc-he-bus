import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { executeSyncForConnection } from "@/lib/hr-integration/sync-orchestrator";
import type { Database } from "@/lib/supabase/types";

type HrConnectionRow = Database["public"]["Tables"]["hr_connections"]["Row"];

/**
 * Vercel Cron: 毎時実行。
 * is_active=true かつ schedule != 'manual' の接続のうち、
 * 現在時刻がスケジュール条件に合致するものを同期する。
 */
export async function GET(request: Request) {
  // CRON_SECRET 検証
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // スケジュール対象の接続を取得
  const { data: rawConnections, error } = await supabase
    .from("hr_connections")
    .select("id, schedule, schedule_time, schedule_day_of_week")
    .eq("is_active", true)
    .neq("schedule", "manual");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch connections", detail: error.message },
      { status: 500 }
    );
  }

  const connections = (rawConnections ?? []) as unknown as Pick<HrConnectionRow, "id" | "schedule" | "schedule_time" | "schedule_day_of_week">[];

  if (connections.length === 0) {
    return NextResponse.json({ message: "No scheduled connections", synced: 0 });
  }

  // 現在時刻でスケジュールマッチング
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDayOfWeek = now.getUTCDay();

  const matchingConnections = connections.filter((conn) => {
    // schedule_time の時間部分を取得 (HH:MM → 時間のみ)
    const scheduleHour = conn.schedule_time
      ? parseInt(conn.schedule_time.split(":")[0], 10)
      : 3;

    // 時間が一致しなければスキップ
    if (currentHour !== scheduleHour) return false;

    // weekly の場合は曜日もチェック
    if (conn.schedule === "weekly") {
      return conn.schedule_day_of_week === currentDayOfWeek;
    }

    // daily は時間一致だけでOK
    return true;
  });

  if (matchingConnections.length === 0) {
    return NextResponse.json({
      message: "No connections due for sync at this time",
      synced: 0,
      checked: connections.length,
    });
  }

  // 各接続を同期実行
  const results = [];
  for (const conn of matchingConnections) {
    try {
      const result = await executeSyncForConnection(conn.id);
      results.push({
        connectionId: conn.id,
        status: result.status,
        recordsFetched: result.recordsFetched,
      });
    } catch (error) {
      results.push({
        connectionId: conn.id,
        status: "error",
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({
    message: `Synced ${results.length} connections`,
    synced: results.length,
    results,
  });
}
