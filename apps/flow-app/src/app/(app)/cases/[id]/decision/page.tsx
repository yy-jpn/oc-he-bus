import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { getDecision } from "@/lib/actions/decisions";
import { DecisionForm } from "./decision-form";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  if (caseData.current_phase !== "phase4_decision") {
    redirect(`/cases/${id}`);
  }

  const leave = caseData.leaves[0];
  if (!leave) {
    redirect(`/cases/${id}`);
  }

  const decision = await getDecision(leave.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">復職判定</h1>
          <PhaseBadge phase={caseData.current_phase} />
        </div>
        <Link
          href={`/cases/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          戻る
        </Link>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          職業準備性ピラミッドに基づく5層のチェックリストで、復職の可否を段階的に判断します。
          下位層（L1）から順に確認し、下位層が満たされていない状態で上位層の評価には進めません。
        </p>
      </div>

      <DecisionForm caseId={id} leaveId={leave.id} decision={decision} />
    </div>
  );
}
