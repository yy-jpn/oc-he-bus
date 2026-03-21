import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseBadge } from "@/components/cases/phase-badge";
import { getNextActions } from "@/lib/utils/next-action";
import type { CaseWithEmployee } from "@/types/case";

export function ActionRequiredList({ cases }: { cases: CaseWithEmployee[] }) {
  const actionItems = cases
    .flatMap((c) => {
      const actions = getNextActions(c);
      return actions
        .filter((a) => a.priority === "high")
        .map((a) => ({ ...a, case: c }));
    })
    .slice(0, 5);

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">要対応</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            現在、要対応の項目はありません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">要対応</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionItems.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {item.case.employees?.name ?? "不明"}
                </span>
                <PhaseBadge phase={item.case.current_phase} />
              </div>
              <p className="text-xs text-muted-foreground">{item.title}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
