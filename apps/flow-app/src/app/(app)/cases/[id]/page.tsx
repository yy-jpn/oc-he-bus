import { notFound } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { getNextActions } from "@/lib/utils/next-action";
import { PhaseBadge } from "@/components/cases/phase-badge";
import { CaseTimeline } from "@/components/cases/case-timeline";
import { NextActionGuide } from "@/components/cases/next-action-guide";
import { CaseActions } from "@/components/cases/case-actions";
import { Separator } from "@/components/ui/separator";
import { TRIGGER_TYPES } from "@/types/phase";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  const actions = getNextActions(caseData);
  const triggerLabel =
    TRIGGER_TYPES[caseData.trigger_type as keyof typeof TRIGGER_TYPES] ??
    caseData.trigger_type;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {caseData.employees?.name ?? "不明"}
            </h1>
            <PhaseBadge phase={caseData.current_phase} />
          </div>
          <p className="text-sm text-muted-foreground">
            {caseData.employees?.department ?? ""}{" "}
            {caseData.employees?.position ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CaseActions caseId={id} currentPhase={caseData.current_phase} />
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            ダッシュボードに戻る
          </Link>
        </div>
      </div>

      <NextActionGuide actions={actions} />

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold">ケース情報</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">トリガー種別</dt>
              <dd className="font-medium">{triggerLabel}</dd>
            </div>
            {caseData.trigger_detail && (
              <div>
                <dt className="text-muted-foreground">詳細</dt>
                <dd>{caseData.trigger_detail}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">検知日</dt>
              <dd>
                {caseData.detected_at
                  ? new Date(caseData.detected_at).toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">作成日</dt>
              <dd>
                {new Date(caseData.created_at).toLocaleDateString("ja-JP")}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">タイムライン</h2>
          <CaseTimeline events={caseData.case_events} />
        </div>
      </div>
    </div>
  );
}
