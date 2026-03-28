"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  triggerManualSync,
  deleteConnection,
  type ConnectionListItem,
} from "@/lib/actions/connections";
import {
  getDataTypeLabel,
  getAdapterDefinition,
} from "@/lib/hr-integration/adapters/registry";

const ALL_DATA_TYPES = ["overtime", "attendance", "health_check", "stress_check"];

const ADAPTER_ICONS: Record<string, string> = {
  smarthr: "🏢",
  freee: "📊",
};

const ADAPTER_NAMES: Record<string, string> = {
  smarthr: "SmartHR",
  freee: "freee人事労務",
};

const SCHEDULE_LABELS: Record<string, string> = {
  manual: "手動",
  daily: "毎日",
  weekly: "毎週",
};

function StatusIndicator({ status, alerts }: { status: string | null; alerts: number }) {
  if (alerts > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-red-600 dark:text-red-400">要対応</span>
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="text-green-600 dark:text-green-400">正常</span>
      </span>
    );
  }

  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="text-yellow-600 dark:text-yellow-400">一部失敗</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-red-600 dark:text-red-400">失敗</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      <span className="text-muted-foreground">未実行</span>
    </span>
  );
}

export function ConnectionList({
  connections,
}: {
  connections: ConnectionListItem[];
}) {
  const router = useRouter();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    id: string;
    message: string;
    status: string;
  } | null>(null);

  function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    setSyncResult(null);
    startTransition(async () => {
      try {
        const result = await triggerManualSync(connectionId);
        setSyncResult({
          id: connectionId,
          message: result.message,
          status: result.status,
        });
        router.refresh();
      } catch (e) {
        setSyncResult({
          id: connectionId,
          message: `エラー: ${(e as Error).message}`,
          status: "failed",
        });
      } finally {
        setSyncingId(null);
      }
    });
  }

  function handleDelete(connectionId: string, name: string) {
    if (!confirm(`「${name}」接続を削除しますか？同期履歴も削除されます。`)) return;
    setDeletingId(connectionId);
    startTransition(async () => {
      try {
        await deleteConnection(connectionId);
        router.refresh();
      } catch {
        // エラーは無視
      } finally {
        setDeletingId(null);
      }
    });
  }

  // 空状態
  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2">
            API連携がまだ設定されていません
          </h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            SmartHRやfreee人事労務などの外部HRサービスと連携して、
            健診結果・ストレスチェック・勤怠データを自動で取り込むことができます。
          </p>
          <Link href="/settings/connections/new" className={buttonVariants()}>
            接続を追加する
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/settings/connections/new" className={buttonVariants()}>
          接続を追加
        </Link>
      </div>

      <div className="grid gap-4">
        {connections.map((conn) => (
          <Card key={conn.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {ADAPTER_ICONS[conn.adapterType] ?? "🔌"}
                  </span>
                  <div>
                    <CardTitle className="text-base">
                      {conn.displayName}
                    </CardTitle>
                    <CardDescription>
                      {ADAPTER_NAMES[conn.adapterType] ?? conn.adapterType}
                      {" · "}
                      {SCHEDULE_LABELS[conn.schedule] ?? conn.schedule}
                      {conn.schedule !== "manual" &&
                        conn.scheduleTime &&
                        ` ${conn.scheduleTime.substring(0, 5)}`}
                    </CardDescription>
                  </div>
                </div>
                <StatusIndicator
                  status={conn.lastSyncStatus}
                  alerts={conn.unresolvedAlerts}
                />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1 mb-3">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground mr-1">取得可能:</span>
                  {conn.syncDataTypes.map((dt) => (
                    <span
                      key={dt}
                      className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400"
                    >
                      {getDataTypeLabel(dt)}
                    </span>
                  ))}
                </div>
                {(() => {
                  const adapterDef = getAdapterDefinition(conn.adapterType);
                  const unsupported = ALL_DATA_TYPES.filter(
                    (dt) => !adapterDef?.supportedDataTypes.includes(dt)
                  );
                  if (unsupported.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground mr-1">取得不可:</span>
                      {unsupported.map((dt) => (
                        <span
                          key={dt}
                          className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-500"
                        >
                          {getDataTypeLabel(dt)}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {conn.lastSyncedAt && (
                <p className="text-sm text-muted-foreground">
                  最終同期:{" "}
                  {new Date(conn.lastSyncedAt).toLocaleString("ja-JP")}
                </p>
              )}

              {/* アラートバナー */}
              {conn.unresolvedAlerts > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
                  {conn.unresolvedAlerts}件の未解決アラートがあります
                </div>
              )}

              {/* 同期結果フィードバック */}
              {syncResult?.id === conn.id && (
                <div
                  className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                    syncResult.status === "completed"
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400"
                      : syncResult.status === "partial"
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400"
                  }`}
                >
                  {syncResult.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                size="sm"
                onClick={() => handleSync(conn.id)}
                disabled={syncingId === conn.id || isPending}
              >
                {syncingId === conn.id ? "同期中..." : "同期実行"}
              </Button>
              <Link
                href={`/settings/connections/${conn.id}/edit`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                編集
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(conn.id, conn.displayName)}
                disabled={deletingId === conn.id || isPending}
                className="text-destructive hover:text-destructive"
              >
                {deletingId === conn.id ? "削除中..." : "削除"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
