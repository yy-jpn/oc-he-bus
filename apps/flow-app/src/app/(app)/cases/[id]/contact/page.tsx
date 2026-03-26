import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { getContactReminders } from "@/lib/actions/contacts";
import { ContactManagement } from "./contact-management";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  if (caseData.current_phase !== "phase2_rest") {
    redirect(`/cases/${id}`);
  }

  const leave = caseData.leaves[0];
  if (!leave) {
    redirect(`/cases/${id}`);
  }

  const reminders = await getContactReminders(leave.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">定期連絡管理</h1>
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
          療養中の定期連絡を管理します。スケジュールに基づいて連絡を実施し、記録してください。
          主治医から「復職可能」の意見が出された場合は、復職準備フェーズへ移行できます。
        </p>
      </div>

      <ContactManagement
        caseId={id}
        leaveId={leave.id}
        reminders={reminders}
        contactMethod={leave.contact_method ?? "email"}
        contactFrequency={leave.contact_frequency ?? "monthly"}
      />
    </div>
  );
}
