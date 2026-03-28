"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateThresholdSetting,
  toggleThresholdRule,
  toggleAutoApprove,
} from "@/lib/actions/threshold-settings";
import type { Database } from "@/lib/supabase/types";

type ThresholdSettingRow =
  Database["public"]["Tables"]["threshold_settings"]["Row"];

const RULE_LABELS: Record<string, { title: string; description: string }> = {
  overtime_single_month: {
    title: "単月時間外労働",
    description: "指定時間以上の時間外労働が発生した場合にケース候補を生成",
  },
  overtime_consecutive: {
    title: "連続月時間外労働",
    description: "指定月数連続で閾値を超えた場合にケース候補を生成",
  },
  stress_check_high: {
    title: "ストレスチェック高リスク",
    description: "高ストレス判定者をケース候補として検出",
  },
  health_check_non_normal: {
    title: "健康診断 就業判定異常",
    description: "「通常勤務」以外の就業判定をケース候補として検出",
  },
  attendance_multiple_events: {
    title: "勤怠異常（複数回）",
    description: "指定期間内に複数の勤怠イベントが発生した場合に検出",
  },
};

export function ThresholdSettingsForm({
  settings,
}: {
  settings: ThresholdSettingRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingParams, setEditingParams] = useState<
    Record<string, Record<string, number>>
  >(() => {
    const initial: Record<string, Record<string, number>> = {};
    for (const s of settings) {
      const params = s.parameters as Record<string, unknown>;
      const numParams: Record<string, number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === "number") numParams[k] = v;
      }
      initial[s.id] = numParams;
    }
    return initial;
  });

  const ALL_EVENT_TYPES = [
    { key: "tardiness", label: "遅刻" },
    { key: "early_leave", label: "早退" },
    { key: "non_pto_absence", label: "無届欠勤" },
    { key: "same_day_pto", label: "当日有休" },
  ] as const;

  const [editingEventTypes, setEditingEventTypes] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    for (const s of settings) {
      const params = s.parameters as Record<string, unknown>;
      if (Array.isArray(params.enabled_event_types)) {
        initial[s.id] = params.enabled_event_types as string[];
      } else {
        initial[s.id] = ALL_EVENT_TYPES.map((t) => t.key);
      }
    }
    return initial;
  });

  function handleToggleEnabled(id: string, currentEnabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleThresholdRule(id, !currentEnabled);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "更新に失敗しました");
      }
    });
  }

  function handleToggleAutoApprove(id: string, currentAuto: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleAutoApprove(id, !currentAuto);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "更新に失敗しました");
      }
    });
  }

  function handleSaveParams(id: string, ruleKey?: string) {
    setError(null);
    startTransition(async () => {
      try {
        const params: Record<string, unknown> = { ...(editingParams[id] ?? {}) };
        if (ruleKey === "attendance_multiple_events") {
          params.enabled_event_types = editingEventTypes[id] ?? ALL_EVENT_TYPES.map((t) => t.key);
        }
        await updateThresholdSetting(id, params);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  function handleToggleEventType(settingId: string, eventType: string) {
    setEditingEventTypes((prev) => {
      const current = prev[settingId] ?? ALL_EVENT_TYPES.map((t) => t.key);
      const next = current.includes(eventType)
        ? current.filter((t) => t !== eventType)
        : [...current, eventType];
      return { ...prev, [settingId]: next };
    });
  }

  function updateParam(id: string, key: string, value: string) {
    setEditingParams((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: parseFloat(value) || 0 },
    }));
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {settings.map((setting) => {
        const ruleInfo = RULE_LABELS[setting.rule_key] ?? {
          title: setting.rule_key,
          description: "",
        };
        const params = editingParams[setting.id] ?? {};

        return (
          <Card key={setting.id} className={!setting.enabled ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{ruleInfo.title}</CardTitle>
                  <CardDescription>{ruleInfo.description}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={setting.enabled}
                      onCheckedChange={() =>
                        handleToggleEnabled(setting.id, setting.enabled)
                      }
                      disabled={isPending}
                    />
                    有効
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={setting.auto_approve}
                      onCheckedChange={() =>
                        handleToggleAutoApprove(setting.id, setting.auto_approve)
                      }
                      disabled={isPending}
                    />
                    自動承認
                  </label>
                </div>
              </div>
            </CardHeader>
            {setting.enabled && (Object.keys(params).length > 0 || setting.rule_key === "attendance_multiple_events") && (
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label>{PARAM_LABELS[key] ?? key}</Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          updateParam(setting.id, key, e.target.value)
                        }
                        className="w-32"
                        disabled={isPending}
                      />
                    </div>
                  ))}
                </div>

                {setting.rule_key === "attendance_multiple_events" && (
                  <div className="space-y-2">
                    <Label>カウント対象イベント</Label>
                    <div className="flex flex-wrap gap-4">
                      {ALL_EVENT_TYPES.map((et) => (
                        <label key={et.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(editingEventTypes[setting.id] ?? []).includes(et.key)}
                            onCheckedChange={() =>
                              handleToggleEventType(setting.id, et.key)
                            }
                            disabled={isPending}
                          />
                          {et.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveParams(setting.id, setting.rule_key)}
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
  );
}

const PARAM_LABELS: Record<string, string> = {
  threshold: "閾値（時間）",
  consecutive_months: "連続月数",
  event_count: "イベント件数",
  period_weeks: "対象期間（週）",
};
