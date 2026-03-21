import type { CaseWithEmployee } from "@/types/case";

export type NextAction = {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
};

export function getNextActions(caseData: CaseWithEmployee): NextAction[] {
  const actions: NextAction[] = [];
  const basePath = `/cases/${caseData.id}`;

  switch (caseData.current_phase) {
    case "phase0_detection":
      actions.push({
        priority: "high",
        title: "面談を実施する",
        description: "本人との面談を実施し、状況を確認してください",
        href: `${basePath}/interview`,
      });
      break;
    case "phase0_monitoring":
      actions.push({
        priority: "medium",
        title: "経過を確認する",
        description: "定期的に状態を確認してください",
        href: basePath,
      });
      actions.push({
        priority: "medium",
        title: "面談を実施する",
        description: "必要に応じて追加の面談を行ってください",
        href: `${basePath}/interview`,
      });
      break;
    case "phase1_leave_start":
      actions.push({
        priority: "high",
        title: "休職開始手続きを行う",
        description: "休職情報の記録と情報提供チェックリストを完了してください",
        href: `${basePath}/leave`,
      });
      break;
    case "phase2_rest":
      actions.push({
        priority: "medium",
        title: "定期連絡を確認する",
        description: "スケジュールに基づいて定期連絡を実施してください",
        href: `${basePath}/contact`,
      });
      break;
    case "phase3_preparation":
      actions.push({
        priority: "high",
        title: "復職準備状況を確認する",
        description: "職業準備性ピラミッドに基づくチェックリストを確認してください",
        href: `${basePath}/preparation`,
      });
      break;
    case "phase4_decision":
      actions.push({
        priority: "high",
        title: "復職判定を行う",
        description: "5層ピラミッドチェックリストに基づいて判定してください",
        href: `${basePath}/decision`,
      });
      break;
    default:
      break;
  }

  return actions;
}
