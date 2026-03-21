import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { LeaveForm } from "./leave-form";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function LeavePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  if (caseData.current_phase !== "phase1_leave_start") {
    redirect(`/cases/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">休職開始手続き</h1>
          <PhaseBadge phase={caseData.current_phase} />
        </div>
        <Link
          href={`/cases/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          戻る
        </Link>
      </div>

      <LeaveForm caseId={id} />
    </div>
  );
}
