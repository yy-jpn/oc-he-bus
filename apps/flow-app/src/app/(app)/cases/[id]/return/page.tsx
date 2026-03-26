import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { ReturnForm } from "./return-form";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  const isFullReturn = caseData.current_phase === "phase5a_full_return";
  const isGradualReturn = caseData.current_phase === "phase5b_gradual_return";

  if (!isFullReturn && !isGradualReturn) {
    redirect(`/cases/${id}`);
  }

  const leave = caseData.leaves[0];
  if (!leave) {
    redirect(`/cases/${id}`);
  }

  const returnType = isFullReturn ? "full_duty" : "gradual";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {isFullReturn ? "通常勤務で復職" : "段階的復職の記録"}
          </h1>
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
          {isFullReturn
            ? "復職判定でL1〜L5すべてが充足されました。復職日と復職先を記録してケースを完了します。"
            : "段階的復職が承認されました。復職日と復職先を記録してください。"}
        </p>
      </div>

      <ReturnForm
        caseId={id}
        leaveId={leave.id}
        returnType={returnType as "full_duty" | "gradual"}
        employeeDepartment={caseData.employees?.department ?? null}
        employeePosition={caseData.employees?.position ?? null}
      />
    </div>
  );
}
