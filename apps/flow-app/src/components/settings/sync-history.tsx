"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SyncLogItem } from "@/lib/actions/connections";
import { getDataTypeLabel } from "@/lib/hr-integration/adapters/registry";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed:
      "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    partial:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
    failed:
      "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    running:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  };

  const labels: Record<string, string> = {
    completed: "成功",
    partial: "一部失敗",
    failed: "失敗",
    running: "実行中",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? styles.failed
      }`}
    >
      {status === "running" && (
        <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      )}
      {labels[status] ?? status}
    </span>
  );
}

export function SyncHistory({ logs }: { logs: SyncLogItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>同期履歴</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expandedId === log.id ? null : log.id)
                }
                className="flex w-full items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="text-muted-foreground">
                    {new Date(log.startedAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  {log.recordsFetched > 0 && (
                    <span>{log.recordsFetched}件取得</span>
                  )}
                  {log.casesCreated > 0 && (
                    <span>{log.casesCreated}件作成</span>
                  )}
                  {log.candidatesCreated > 0 && (
                    <span>{log.candidatesCreated}件候補</span>
                  )}
                  <span className="text-xs">
                    {expandedId === log.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {expandedId === log.id && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 pl-4 py-2 text-sm">
                  {log.completedAt && (
                    <p className="text-muted-foreground">
                      完了:{" "}
                      {new Date(log.completedAt).toLocaleString("ja-JP")}
                    </p>
                  )}

                  {log.dataTypesSucceeded &&
                    log.dataTypesSucceeded.length > 0 && (
                      <p>
                        <span className="text-green-600 dark:text-green-400">
                          成功:
                        </span>{" "}
                        {log.dataTypesSucceeded
                          .map(getDataTypeLabel)
                          .join(", ")}
                      </p>
                    )}

                  {log.dataTypesFailed &&
                    log.dataTypesFailed.length > 0 && (
                      <p>
                        <span className="text-red-600 dark:text-red-400">
                          失敗:
                        </span>{" "}
                        {log.dataTypesFailed
                          .map(getDataTypeLabel)
                          .join(", ")}
                      </p>
                    )}

                  {log.casesUpdated > 0 && (
                    <p>ケース更新: {log.casesUpdated}件</p>
                  )}

                  {log.errorMessage && (
                    <p className="text-red-600 dark:text-red-400">
                      エラー: {log.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
