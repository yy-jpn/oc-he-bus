"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { createOrUpdatePreparation, transitionToDecision, type ReturnPreparation } from "@/lib/actions/preparations";

type Preparation = ReturnPreparation | null;

const CHECKLIST_ITEMS = [
  {
    key: "l1",
    label: "L1: 復職の意思",
    description: "本人から復職の意思表示がある",
    gate: true,
  },
  {
    key: "l2",
    label: "L2: 主治医の復職可能診断書",
    description: "主治医の復職可能診断書を受領している",
    gate: true,
  },
  {
    key: "l3",
    label: "L3: セルフケアの確立",
    description: "生活リズムの安定、通院・服薬の自己管理、整容・身だしなみ、日中の外出、適切な食事",
  },
  {
    key: "l4",
    label: "L4: コミュニケーション",
    description: "家族・友人、第三者、リワーク施設職員、人事部との対人コミュニケーションに問題なし",
  },
  {
    key: "l5",
    label: "L5: 業務遂行能力",
    description: "リワーク等での出席率安定、作業遂行、集中力、通勤訓練",
  },
];

export function PreparationForm({
  caseId,
  leaveId,
  preparation,
}: {
  caseId: string;
  leaveId: string;
  preparation: Preparation;
}) {
  const [isPending, startTransition] = useTransition();

  const l1Checked = preparation?.checklist_l1_return_intention ?? false;
  const l2Checked = preparation?.checklist_l2_doctor_clearance ?? false;
  const gateOpen = l1Checked && l2Checked;
  const allChecked =
    gateOpen &&
    (preparation?.checklist_l3_self_care ?? false) &&
    (preparation?.checklist_l4_communication ?? false) &&
    (preparation?.checklist_l5_work_performance ?? false);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await createOrUpdatePreparation(caseId, leaveId, formData);
    });
  }

  function handleTransition() {
    if (!confirm("復職判定フェーズへ移行しますか？")) return;
    startTransition(async () => {
      await transitionToDecision(caseId);
    });
  }

  return (
    <div className="space-y-6">
      <form action={handleSave}>
        {/* リワーク利用状況 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">リワーク利用状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rework_enrolled"
                name="rework_enrolled"
                defaultChecked={preparation?.rework_enrolled ?? false}
              />
              <Label htmlFor="rework_enrolled">リワークプログラムを利用している</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rework_facility_name">施設名</Label>
              <Input
                id="rework_facility_name"
                name="rework_facility_name"
                defaultValue={preparation?.rework_facility_name ?? ""}
                placeholder="リワーク施設名"
              />
            </div>

            <div className="space-y-2">
              <Label>リワークステータス</Label>
              <RadioGroup
                name="rework_status"
                defaultValue={preparation?.rework_status ?? "not_applicable"}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="in_progress" id="rework_in_progress" />
                  <Label htmlFor="rework_in_progress">実施中</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="completed" id="rework_completed" />
                  <Label htmlFor="rework_completed">修了</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="not_applicable" id="rework_na" />
                  <Label htmlFor="rework_na">該当なし</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* 職業準備性ピラミッド チェックリスト */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">職業準備性ピラミッド チェックリスト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L1（復職の意思）・L2（主治医の診断書）が揃ってから、L3〜L5を順次確認してください。
            </p>

            {CHECKLIST_ITEMS.map((item, index) => {
              const isGated = index >= 2 && !gateOpen;
              const fieldName = `checklist_${item.key}`;
              const defaultChecked =
                preparation?.[
                  `checklist_${item.key}_return_intention` as keyof typeof preparation
                ] ??
                preparation?.[
                  `checklist_${item.key}_doctor_clearance` as keyof typeof preparation
                ] ??
                preparation?.[
                  `checklist_${item.key}_self_care` as keyof typeof preparation
                ] ??
                preparation?.[
                  `checklist_${item.key}_communication` as keyof typeof preparation
                ] ??
                preparation?.[
                  `checklist_${item.key}_work_performance` as keyof typeof preparation
                ] ??
                false;

              return (
                <div
                  key={item.key}
                  className={`rounded-lg border p-3 ${isGated ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={fieldName}
                      name={fieldName}
                      defaultChecked={defaultChecked as boolean}
                      disabled={isGated}
                    />
                    <div>
                      <Label htmlFor={fieldName} className="font-medium">
                        {item.label}
                        {item.gate && (
                          <span className="ml-2 text-xs text-orange-600">ゲート条件</span>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* メモ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">メモ</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="notes"
              defaultValue={preparation?.notes ?? ""}
              placeholder="復職準備に関するメモ"
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "保存中..." : "保存する"}
        </Button>
      </form>

      <Separator />

      {/* Phase 3 → 4 遷移 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-base">復職判定への移行</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            すべてのチェックリスト項目が完了したら、復職判定フェーズへ移行できます。
          </p>
          <Button onClick={handleTransition} disabled={isPending || !allChecked}>
            {isPending ? "移行中..." : "復職判定へ進む"}
          </Button>
          {!allChecked && (
            <p className="text-xs text-muted-foreground">
              ※ すべてのチェックリスト項目を完了してから保存し、ページを再読み込みしてください
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
