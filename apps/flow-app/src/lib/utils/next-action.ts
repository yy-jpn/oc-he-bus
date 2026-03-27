import type { CaseWithEmployee } from "@/types/case";

export type NextAction = {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  actionType?: "follow_up_complete";
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
      actions.push({
        priority: "low",
        title: "フォローを終了する",
        description: "状態が安定した場合、フォローを終了できます",
        href: basePath,
        actionType: "follow_up_complete",
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
    case "phase5a_full_return":
      actions.push({
        priority: "high",
        title: "復職を記録する",
        description: "復職日と復職先を記録してケースを完了してください",
        href: `${basePath}/return`,
      });
      break;
    case "phase5b_gradual_return":
      actions.push({
        priority: "high",
        title: "段階的復職を管理する",
        description: "段階的復職スケジュールと再発防止計画を管理してください",
        href: `${basePath}/gradual-return`,
      });
      break;
    default:
      break;
  }

  return actions;
}
