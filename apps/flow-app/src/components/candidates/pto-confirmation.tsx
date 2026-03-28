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
import { Checkbox } from "@/components/ui/checkbox";
import {
  confirmSameDayPto,
  dismissPtoAbsence,
  type PtoAbsenceRecord,
} from "@/lib/actions/pto-confirmation";

interface PtoConfirmationProps {
  records: PtoAbsenceRecord[];
}

export function PtoConfirmationBanner({ records }: PtoConfirmationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  if (records.length === 0) return null;

  // 従業員ごとにグループ化
  const byEmployee = new Map<string, PtoAbsenceRecord[]>();
  for (const r of records) {
    const key = `${r.employeeCode}:${r.employeeName}`;
    const existing = byEmployee.get(key) ?? [];
    existing.push(r);
    byEmployee.set(key, existing);
  }

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirm() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      await confirmSameDayPto(ids);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleDismissAll() {
    const allIds = records.map((r) => r.id);
    const unselectedIds = allIds.filter((id) => !selectedIds.has(id));
    if (unselectedIds.length === 0) return;
    startTransition(async () => {
      await dismissPtoAbsence(unselectedIds);
      router.refresh();
    });
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              有給欠勤の当日申請確認
            </CardTitle>
            <CardDescription>
              {records.length}件の有給欠勤日について、当日申請だったかの確認が必要です
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "閉じる" : "確認する"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            以下の有給休暇取得日の中から、当日申請（当日報告）だった日を選択してください。
            チェックした日が「当日有休」として勤怠異常のカウント対象になります。
          </p>

          {Array.from(byEmployee.entries()).map(([key, empRecords]) => {
            const [code, name] = key.split(":");
            return (
              <div key={key} className="space-y-2">
                <h4 className="text-sm font-medium">
                  {name} ({code})
                </h4>
                <div className="grid gap-1.5 pl-4">
                  {empRecords.map((r) => {
                    const date = new Date(r.eventDate);
                    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][
                      date.getDay()
                    ];
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => handleToggle(r.id)}
                          disabled={isPending}
                        />
                        {r.eventDate} ({dayOfWeek})
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isPending || selectedIds.size === 0}
            >
              {isPending ? "処理中..." : `選択した${selectedIds.size}件を当日有休として確定`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismissAll}
              disabled={isPending}
            >
              未選択分を「当日申請ではない」として除外
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
