import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/actions/cases";
import { InterviewForm } from "./interview-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhaseBadge } from "@/components/cases/phase-badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseDetail(id);

  if (!caseData) notFound();

  // Only allow interviews in Phase 0
  if (
    !caseData.current_phase.startsWith("phase0")
  ) {
    redirect(`/cases/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">面談記録</h1>
          <PhaseBadge phase={caseData.current_phase} />
        </div>
        <Link
          href={`/cases/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          戻る
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">面談ガイド</CardTitle>
          <CardDescription>
            面談時に確認すべきポイント
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">確認すべきポイント:</p>
            <ul className="ml-4 mt-1 list-disc space-y-1 text-muted-foreground">
              <li>体調や睡眠の状況</li>
              <li>業務上の困りごとや負担感</li>
              <li>職場の人間関係</li>
              <li>プライベートでのストレス要因</li>
              <li>医療機関への受診状況</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">注意事項:</p>
            <ul className="ml-4 mt-1 list-disc space-y-1 text-muted-foreground">
              <li>本人の話をよく聴き、傾聴の姿勢で臨む</li>
              <li>無理に原因を追及しない</li>
              <li>プライバシーへの配慮を忘れない</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <InterviewForm caseId={id} />
    </div>
  );
}
