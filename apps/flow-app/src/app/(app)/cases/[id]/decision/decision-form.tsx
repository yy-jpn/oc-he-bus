"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { saveDecision, finalizeDecision, type ReturnDecision } from "@/lib/actions/decisions";
import { Lock, CheckCircle } from "lucide-react";

type Decision = ReturnDecision | null;

function CheckItem({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={name}
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
      />
      <Label htmlFor={name} className={disabled ? "text-muted-foreground" : ""}>
        {label}
      </Label>
    </div>
  );
}

function LayerCard({
  level,
  title,
  locked,
  completed,
  children,
}: {
  level: string;
  title: string;
  locked: boolean;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={locked ? "opacity-50" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {locked ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : completed ? (
            <CheckCircle className="size-4 text-green-600" />
          ) : (
            <Badge variant="outline" className="text-xs">{level}</Badge>
          )}
          {title}
          {locked && (
            <span className="text-xs text-muted-foreground">（下位層を先に完了してください）</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function DecisionForm({
  caseId,
  leaveId,
  decision,
}: {
  caseId: string;
  leaveId: string;
  decision: Decision;
}) {
  const [isPending, startTransition] = useTransition();

  const d = decision;

  // Layer completion checks
  const l1Complete = d?.l1_return_intention ?? false;
  const l2Complete = (d?.l2_doctor_clearance ?? false) && (d?.l2_symptom_stable ?? false) && (d?.l2_episode_recall_tolerance ?? false);
  const l3Complete = (d?.l3_life_rhythm_stable ?? false) && (d?.l3_medication_self_managed ?? false) && (d?.l3_grooming_adequate ?? false) && (d?.l3_daily_outing_possible ?? false) && (d?.l3_eating_adequate ?? false);
  const l4Complete = (d?.l4_family_friends_ok ?? false) && (d?.l4_strangers_ok ?? false) && (d?.l4_hr_interview_ok ?? false);
  const l5Complete = (d?.l5_attendance_stable ?? false) && (d?.l5_task_performance_ok ?? false) && (d?.l5_concentration_adequate ?? false) && (d?.l5_commute_training_ok ?? false);
  const allComplete = l1Complete && l2Complete && l3Complete && l4Complete && l5Complete;

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await saveDecision(caseId, leaveId, formData);
    });
  }

  function handleFinalize(type: "approved_full" | "approved_gradual" | "deferred") {
    const labels = {
      approved_full: "通常勤務での復職",
      approved_gradual: "段階的復職",
      deferred: "復職準備への差し戻し",
    };
    if (!confirm(`「${labels[type]}」で判定を確定しますか？`)) return;
    startTransition(async () => {
      await finalizeDecision(caseId, leaveId, type);
    });
  }

  return (
    <div className="space-y-6">
      <form action={handleSave}>
        {/* L1: 復職の意思 */}
        <div className="mb-4">
          <LayerCard level="L1" title="復職の意思" locked={false} completed={l1Complete}>
            <CheckItem
              name="l1_return_intention"
              label="本人から復職の意思表示がある"
              defaultChecked={d?.l1_return_intention ?? false}
            />
            <div className="space-y-1">
              <Label htmlFor="l1_intention_expressed_at" className="text-sm">意思表示日</Label>
              <Input
                type="date"
                id="l1_intention_expressed_at"
                name="l1_intention_expressed_at"
                defaultValue={d?.l1_intention_expressed_at ?? ""}
              />
            </div>
          </LayerCard>
        </div>

        {/* L2: 主治医の復職可能診断書 */}
        <div className="mb-4">
          <LayerCard level="L2" title="主治医の復職可能診断書" locked={!l1Complete} completed={l2Complete}>
            <CheckItem
              name="l2_doctor_clearance"
              label="復職可能の診断書を受領した"
              defaultChecked={d?.l2_doctor_clearance ?? false}
              disabled={!l1Complete}
            />
            <CheckItem
              name="l2_symptom_stable"
              label="症状が安定している"
              defaultChecked={d?.l2_symptom_stable ?? false}
              disabled={!l1Complete}
            />
            <CheckItem
              name="l2_episode_recall_tolerance"
              label="エピソード想起耐性あり（発症契機を思い出しても悪化しない）"
              defaultChecked={d?.l2_episode_recall_tolerance ?? false}
              disabled={!l1Complete}
            />
            <div className="space-y-1">
              <Label htmlFor="l2_clearance_received_at" className="text-sm">診断書受領日</Label>
              <Input
                type="date"
                id="l2_clearance_received_at"
                name="l2_clearance_received_at"
                defaultValue={d?.l2_clearance_received_at ?? ""}
                disabled={!l1Complete}
              />
            </div>
          </LayerCard>
        </div>

        {/* L3: セルフケアの確立 */}
        <div className="mb-4">
          <LayerCard level="L3" title="セルフケアの確立" locked={!l2Complete} completed={l3Complete}>
            <p className="text-sm text-muted-foreground">「問題なく一人で暮らすことができる」ことを確認</p>
            <CheckItem
              name="l3_life_rhythm_stable"
              label="生活リズムが安定（起床・就寝時間が一定、日中の活動可能）"
              defaultChecked={d?.l3_life_rhythm_stable ?? false}
              disabled={!l2Complete}
            />
            <CheckItem
              name="l3_medication_self_managed"
              label="通院・服薬の自己管理ができている"
              defaultChecked={d?.l3_medication_self_managed ?? false}
              disabled={!l2Complete}
            />
            <CheckItem
              name="l3_grooming_adequate"
              label="整容・身だしなみが整えられている"
              defaultChecked={d?.l3_grooming_adequate ?? false}
              disabled={!l2Complete}
            />
            <CheckItem
              name="l3_daily_outing_possible"
              label="日中の外出が可能"
              defaultChecked={d?.l3_daily_outing_possible ?? false}
              disabled={!l2Complete}
            />
            <CheckItem
              name="l3_eating_adequate"
              label="食事を適切に摂れている"
              defaultChecked={d?.l3_eating_adequate ?? false}
              disabled={!l2Complete}
            />
          </LayerCard>
        </div>

        {/* L4: コミュニケーション */}
        <div className="mb-4">
          <LayerCard level="L4" title="コミュニケーション" locked={!l3Complete} completed={l4Complete}>
            <CheckItem
              name="l4_family_friends_ok"
              label="家族・友人との日常的なコミュニケーションが問題ない"
              defaultChecked={d?.l4_family_friends_ok ?? false}
              disabled={!l3Complete}
            />
            <CheckItem
              name="l4_strangers_ok"
              label="第三者との簡単なやりとりが問題ない"
              defaultChecked={d?.l4_strangers_ok ?? false}
              disabled={!l3Complete}
            />
            <CheckItem
              name="l4_rework_staff_ok"
              label="リワーク施設の職員・利用者とのコミュニケーションが問題ない（リワーク利用時）"
              defaultChecked={d?.l4_rework_staff_ok ?? false}
              disabled={!l3Complete}
            />
            <CheckItem
              name="l4_hr_interview_ok"
              label="人事部職員との面談でのコミュニケーションが円滑"
              defaultChecked={d?.l4_hr_interview_ok ?? false}
              disabled={!l3Complete}
            />
          </LayerCard>
        </div>

        {/* L5: 業務遂行能力 */}
        <div className="mb-4">
          <LayerCard level="L5" title="業務遂行能力" locked={!l4Complete} completed={l5Complete}>
            <CheckItem
              name="l5_attendance_stable"
              label="リワーク等での出席率・勤怠が安定"
              defaultChecked={d?.l5_attendance_stable ?? false}
              disabled={!l4Complete}
            />
            <CheckItem
              name="l5_task_performance_ok"
              label="所定の作業・課題を遂行できる"
              defaultChecked={d?.l5_task_performance_ok ?? false}
              disabled={!l4Complete}
            />
            <CheckItem
              name="l5_concentration_adequate"
              label="集中力が業務に耐えうる水準"
              defaultChecked={d?.l5_concentration_adequate ?? false}
              disabled={!l4Complete}
            />
            <CheckItem
              name="l5_commute_training_ok"
              label="通勤訓練を問題なく実施できる"
              defaultChecked={d?.l5_commute_training_ok ?? false}
              disabled={!l4Complete}
            />
            <CheckItem
              name="l5_rework_completion"
              label="リワーク修了判定を得ている（リワーク利用時）"
              defaultChecked={d?.l5_rework_completion ?? false}
              disabled={!l4Complete}
            />
          </LayerCard>
        </div>

        <Separator className="my-6" />

        {/* 地さんぽ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">地域産業保健センター（任意）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckItem
              name="regional_ohc_consulted"
              label="地さんぽに相談した"
              defaultChecked={d?.regional_ohc_consulted ?? false}
            />
            <div className="space-y-1">
              <Label htmlFor="regional_ohc_opinion" className="text-sm">地さんぽの意見</Label>
              <Textarea
                id="regional_ohc_opinion"
                name="regional_ohc_opinion"
                defaultValue={d?.regional_ohc_opinion ?? ""}
                placeholder="地域産業保健センターからの意見・助言"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* メモ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">判定メモ</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="notes"
              defaultValue={d?.notes ?? ""}
              placeholder="判定に関するメモ"
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "保存中..." : "チェックリストを保存する"}
        </Button>
      </form>

      <Separator />

      {/* 判定確定 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-base">判定結果の確定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            チェックリストを保存した上で、判定結果を確定してください。
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleFinalize("approved_full")}
              disabled={isPending || !allComplete}
              className="w-full"
            >
              L1〜L5すべて充足 → 通常勤務で復職
            </Button>
            <Button
              onClick={() => handleFinalize("approved_gradual")}
              disabled={isPending}
              variant="secondary"
              className="w-full"
            >
              後遺症等でL5が恒久的に不足 → 段階的復職
            </Button>
            <Button
              onClick={() => handleFinalize("deferred")}
              disabled={isPending}
              variant="outline"
              className="w-full"
            >
              基準未充足 → 復職準備に差し戻し
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
