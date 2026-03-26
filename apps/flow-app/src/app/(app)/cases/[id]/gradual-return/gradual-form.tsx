"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addGradualStep,
  updateStepStatus,
  savePreventionPlan,
  completeGradualReturn,
  type GradualStep,
  type PreventionPlan,
} from "@/lib/actions/gradual-returns";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, CheckCircle } from "lucide-react";

const statusLabel: Record<string, string> = {
  planned: "予定",
  in_progress: "実施中",
  completed: "完了",
};

const statusColor: Record<string, string> = {
  planned: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export function GradualReturnManagement({
  caseId,
  returnId,
  steps,
  preventionPlan,
}: {
  caseId: string;
  returnId: string;
  steps: GradualStep[];
  preventionPlan: PreventionPlan | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddStep, setShowAddStep] = useState(false);

  const allStepsCompleted = steps.length > 0 && steps.every((s) => s.status === "completed");

  function handleAddStep(formData: FormData) {
    startTransition(async () => {
      await addGradualStep(returnId, caseId, formData);
      setShowAddStep(false);
    });
  }

  function handleStatusChange(stepId: string, newStatus: string) {
    startTransition(async () => {
      await updateStepStatus(stepId, newStatus, caseId);
    });
  }

  function handleSavePlan(formData: FormData) {
    startTransition(async () => {
      await savePreventionPlan(returnId, caseId, formData);
    });
  }

  function handleComplete() {
    if (!confirm("段階的復職を完了し、ケースをクローズしますか？")) return;
    startTransition(async () => {
      await completeGradualReturn(caseId);
    });
  }

  return (
    <div className="space-y-6">
      {/* スケジュールステップ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">段階的復職スケジュール</CardTitle>
            <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="mr-1 size-4" />
                ステップ追加
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しいステップを追加</DialogTitle>
                </DialogHeader>
                <form action={handleAddStep} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="start_date">開始日 *</Label>
                      <Input type="date" id="start_date" name="start_date" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end_date">終了日 *</Label>
                      <Input type="date" id="end_date" name="end_date" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="work_hours_per_day">勤務時間/日</Label>
                      <Input
                        type="number"
                        id="work_hours_per_day"
                        name="work_hours_per_day"
                        step="0.5"
                        min="1"
                        max="8"
                        placeholder="例: 4.0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="work_days_per_week">勤務日数/週</Label>
                      <Input
                        type="number"
                        id="work_days_per_week"
                        name="work_days_per_week"
                        min="1"
                        max="5"
                        placeholder="例: 3"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="duty_adjustments">業務調整内容</Label>
                    <Textarea
                      id="duty_adjustments"
                      name="duty_adjustments"
                      placeholder="業務内容の調整事項"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="review_date">レビュー日</Label>
                    <Input type="date" id="review_date" name="review_date" />
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "追加中..." : "ステップを追加"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだステップが登録されていません。「ステップ追加」で段階的なスケジュールを設定してください。
            </p>
          ) : (
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        ステップ {step.step_number}
                      </span>
                      <Badge className={statusColor[step.status]}>
                        {statusLabel[step.status]}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {step.status === "planned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(step.id, "in_progress")}
                          disabled={isPending}
                        >
                          開始
                        </Button>
                      )}
                      {step.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(step.id, "completed")}
                          disabled={isPending}
                        >
                          完了
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>
                      期間: {format(new Date(step.start_date), "M/d", { locale: ja })} 〜{" "}
                      {format(new Date(step.end_date), "M/d", { locale: ja })}
                    </div>
                    {step.work_hours_per_day && (
                      <div>{step.work_hours_per_day}時間/日</div>
                    )}
                    {step.work_days_per_week && (
                      <div>{step.work_days_per_week}日/週</div>
                    )}
                    {step.review_date && (
                      <div>
                        レビュー: {format(new Date(step.review_date), "M/d", { locale: ja })}
                      </div>
                    )}
                  </div>
                  {step.duty_adjustments && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      調整: {step.duty_adjustments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 再発防止計画 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">再発防止計画</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSavePlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workplace_adjustments">
                職場調整の継続事項（1行に1項目）
              </Label>
              <Textarea
                id="workplace_adjustments"
                name="workplace_adjustments"
                defaultValue={preventionPlan?.workplace_adjustments?.join("\n") ?? ""}
                placeholder="例: 残業制限（月20時間以内）&#10;例: 出張の制限"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identified_stressors">
                特定されたストレス要因（1行に1項目）
              </Label>
              <Textarea
                id="identified_stressors"
                name="identified_stressors"
                defaultValue={preventionPlan?.identified_stressors?.join("\n") ?? ""}
                placeholder="例: 長時間労働&#10;例: 対人関係のストレス"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="countermeasures">
                対策（1行に1項目）
              </Label>
              <Textarea
                id="countermeasures"
                name="countermeasures"
                defaultValue={preventionPlan?.countermeasures?.join("\n") ?? ""}
                placeholder="例: 定期的な1on1ミーティング&#10;例: 業務量の調整"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monitoring_items">
                モニタリング項目（1行に1項目）
              </Label>
              <Textarea
                id="monitoring_items"
                name="monitoring_items"
                defaultValue={preventionPlan?.monitoring_items?.join("\n") ?? ""}
                placeholder="例: 勤怠状況&#10;例: 本人の主観的な調子"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>モニタリング頻度</Label>
                <RadioGroup
                  name="monitoring_frequency"
                  defaultValue={preventionPlan?.monitoring_frequency ?? "monthly"}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="weekly" id="freq_weekly" />
                    <Label htmlFor="freq_weekly">毎週</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="biweekly" id="freq_biweekly" />
                    <Label htmlFor="freq_biweekly">隔週</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="monthly" id="freq_monthly" />
                    <Label htmlFor="freq_monthly">毎月</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitoring_duration_months">モニタリング期間（月数）</Label>
                <Input
                  type="number"
                  id="monitoring_duration_months"
                  name="monitoring_duration_months"
                  defaultValue={preventionPlan?.monitoring_duration_months ?? 6}
                  min={1}
                  max={24}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_review_date">次回レビュー日</Label>
              <Input
                type="date"
                id="next_review_date"
                name="next_review_date"
                defaultValue={preventionPlan?.next_review_date ?? ""}
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "保存中..." : "再発防止計画を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* ケースクローズ */}
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="size-4" />
            段階的復職の完了
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            すべてのステップが完了したら、ケースをクローズできます。
          </p>
          <Button
            onClick={handleComplete}
            disabled={isPending || !allStepsCompleted}
          >
            {isPending ? "処理中..." : "段階的復職完了 → ケースクローズ"}
          </Button>
          {!allStepsCompleted && steps.length > 0 && (
            <p className="text-xs text-muted-foreground">
              ※ すべてのステップを完了にしてください
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
