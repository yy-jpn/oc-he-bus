import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdapterDefinitions, getSyncLogs } from "@/lib/actions/connections";
import { ConnectionForm } from "@/components/settings/connection-form";
import { SyncHistory } from "@/components/settings/sync-history";

export default async function EditConnectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  // 接続情報を取得（credentials_encrypted除外）
  const { data: connection } = await supabase
    .from("hr_connections")
    .select(
      "id, adapter_type, display_name, auth_type, sync_data_types, schedule, schedule_time, schedule_day_of_week, is_active, config"
    )
    .eq("id", id)
    .eq("company_id", profile.company_id!)
    .single();

  if (!connection) {
    redirect("/settings/connections");
  }

  const adapters = await getAdapterDefinitions();
  const syncLogs = await getSyncLogs(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">接続を編集: {connection.display_name}</h1>
        <p className="text-muted-foreground">
          接続設定の変更と同期履歴の確認ができます
        </p>
      </div>
      <ConnectionForm
        adapters={adapters}
        existingConnection={{
          id: connection.id,
          adapterType: connection.adapter_type,
          displayName: connection.display_name,
          syncDataTypes: connection.sync_data_types ?? [],
          schedule: connection.schedule,
          scheduleTime: connection.schedule_time,
          scheduleDayOfWeek: connection.schedule_day_of_week,
          isActive: connection.is_active,
          config: (connection.config as Record<string, string>) ?? {},
        }}
      />
      {syncLogs.length > 0 && <SyncHistory logs={syncLogs} />}
    </div>
  );
}
