import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { getPreparation } from "@/lib/actions/preparations";
import { PreparationForm } from "./preparation-form";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function PreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  if (caseData.current_phase !== "phase3_preparation") {
    redirect(`/cases/${id}`);
  }

  const leave = caseData.leaves[0];
  if (!leave) {
    redirect(`/cases/${id}`);
  }

  const preparation = await getPreparation(leave.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">復職準備</h1>
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
          リワークプログラムの利用状況を記録し、職業準備性ピラミッドに基づくチェックリストを管理します。
          L1（復職の意思）・L2（主治医の診断書）がゲート条件です。
        </p>
      </div>

      <PreparationForm
        caseId={id}
        leaveId={leave.id}
        preparation={preparation}
      />
    </div>
  );
}
