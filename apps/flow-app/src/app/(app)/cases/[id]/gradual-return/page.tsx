import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import {
  getReturnRecord,
  getGradualSteps,
  getPreventionPlan,
} from "@/lib/actions/gradual-returns";
import { GradualReturnManagement } from "./gradual-form";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function GradualReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  if (caseData.current_phase !== "phase5b_gradual_return") {
    redirect(`/cases/${id}`);
  }

  const leave = caseData.leaves[0];
  if (!leave) redirect(`/cases/${id}`);

  const returnRecord = await getReturnRecord(leave.id);
  if (!returnRecord) redirect(`/cases/${id}/return`);

  const steps = await getGradualSteps(returnRecord.id);
  const preventionPlan = await getPreventionPlan(returnRecord.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">段階的復職管理</h1>
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
          段階的な勤務時間・日数の引き上げスケジュールと再発防止計画を管理します。
          すべてのステップが完了したらケースをクローズできます。
        </p>
      </div>

      <GradualReturnManagement
        caseId={id}
        returnId={returnRecord.id}
        steps={steps}
        preventionPlan={preventionPlan}
      />
    </div>
  );
}
