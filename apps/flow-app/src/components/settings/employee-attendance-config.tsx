"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateEmployeeAttendanceConfig,
  type EmployeeWithConfig,
} from "@/lib/actions/employee-config";
import type { AttendanceConfig } from "@/lib/hr-integration/types";
import { DEFAULT_ATTENDANCE_CONFIG } from "@/lib/hr-integration/types";

interface EmployeeAttendanceConfigProps {
  employees: EmployeeWithConfig[];
  globalConfig: AttendanceConfig;
}

export function EmployeeAttendanceConfig({
  employees,
  globalConfig,
}: EmployeeAttendanceConfigProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<
    Record<string, Partial<AttendanceConfig> & { hasPersonalConfig: boolean }>
  >(() => {
    const initial: Record<string, Partial<AttendanceConfig> & { hasPersonalConfig: boolean }> = {};
    for (const emp of employees) {
      initial[emp.id] = emp.attendanceConfig
        ? { ...emp.attendanceConfig, hasPersonalConfig: true }
        : { hasPersonalConfig: false };
    }
    return initial;
  });

  function handleSave(employeeId: string) {
    setError(null);
    const editing = editingConfig[employeeId];
    if (!editing) return;

    startTransition(async () => {
      try {
        if (!editing.hasPersonalConfig) {
          await updateEmployeeAttendanceConfig(employeeId, null);
        } else {
          const config: AttendanceConfig = {
            scheduledStartTime:
              editing.scheduledStartTime || globalConfig.scheduledStartTime,
            scheduledWorkMinutes:
              editing.scheduledWorkMinutes ?? globalConfig.scheduledWorkMinutes,
            flexTimeEnabled: editing.flexTimeEnabled ?? false,
          };
          await updateEmployeeAttendanceConfig(employeeId, config);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  function updateField<K extends keyof AttendanceConfig>(
    employeeId: string,
    key: K,
    value: AttendanceConfig[K]
  ) {
    setEditingConfig((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [key]: value },
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>全体デフォルト設定</CardTitle>
          <CardDescription>
            freee接続の設定で指定された全社共通の基準値です。
            個人設定がない従業員にはこの値が適用されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">所定始業時刻: </span>
              <span className="font-medium">{globalConfig.scheduledStartTime}</span>
            </div>
            <div>
              <span className="text-muted-foreground">所定労働時間: </span>
              <span className="font-medium">{globalConfig.scheduledWorkMinutes}分</span>
            </div>
            <div>
              <span className="text-muted-foreground">フレックスタイム制: </span>
              <span className="font-medium">{globalConfig.flexTimeEnabled ? "あり" : "なし"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {employees.map((emp) => {
          const editing = editingConfig[emp.id];
          const isExpanded = expandedId === emp.id;

          return (
            <Card key={emp.id}>
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => setExpandedId(isExpanded ? null : emp.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      {emp.name}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      ({emp.employeeCode})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {editing?.hasPersonalConfig ? "個人設定あり" : "全体設定を使用"}
                  </span>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={editing?.hasPersonalConfig ?? false}
                      onCheckedChange={(checked) =>
                        setEditingConfig((prev) => ({
                          ...prev,
                          [emp.id]: {
                            ...prev[emp.id],
                            hasPersonalConfig: !!checked,
                            scheduledStartTime:
                              prev[emp.id]?.scheduledStartTime ?? globalConfig.scheduledStartTime,
                            scheduledWorkMinutes:
                              prev[emp.id]?.scheduledWorkMinutes ?? globalConfig.scheduledWorkMinutes,
                            flexTimeEnabled:
                              prev[emp.id]?.flexTimeEnabled ?? globalConfig.flexTimeEnabled,
                          },
                        }))
                      }
                      disabled={isPending}
                    />
                    個人設定を有効にする
                  </label>

                  {editing?.hasPersonalConfig && (
                    <div className="flex flex-wrap gap-4">
                      <div className="space-y-1">
                        <Label>所定始業時刻</Label>
                        <Input
                          type="time"
                          value={editing.scheduledStartTime ?? globalConfig.scheduledStartTime}
                          onChange={(e) =>
                            updateField(emp.id, "scheduledStartTime", e.target.value)
                          }
                          className="w-32"
                          disabled={isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                          全体: {globalConfig.scheduledStartTime}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>所定労働時間（分）</Label>
                        <Input
                          type="number"
                          value={editing.scheduledWorkMinutes ?? globalConfig.scheduledWorkMinutes}
                          onChange={(e) =>
                            updateField(
                              emp.id,
                              "scheduledWorkMinutes",
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-32"
                          disabled={isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                          全体: {globalConfig.scheduledWorkMinutes}分
                        </p>
                      </div>
                      <div className="space-y-1 flex items-end pb-6">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={editing.flexTimeEnabled ?? false}
                            onCheckedChange={(checked) =>
                              updateField(emp.id, "flexTimeEnabled", !!checked)
                            }
                            disabled={isPending}
                          />
                          フレックスタイム制
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(emp.id)}
                      disabled={isPending}
                    >
                      {isPending ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
