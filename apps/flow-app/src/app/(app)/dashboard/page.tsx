import { getCases, getCaseSummary } from "@/lib/actions/cases";
import { PhaseSummary } from "@/components/dashboard/phase-summary";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { CaseTable } from "@/components/dashboard/case-table";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function DashboardPage() {
  const [cases, summary] = await Promise.all([getCases(), getCaseSummary()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <Link href="/cases/new" className={buttonVariants()}>
          新規ケース作成
        </Link>
      </div>

      <PhaseSummary summary={summary} />

      <ActionRequiredList cases={cases} />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">ケース一覧</h2>
        <CaseTable cases={cases} />
      </div>
    </div>
  );
}
