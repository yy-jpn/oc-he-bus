"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { updateCasePhase } from "@/lib/actions/cases";
import type { NextAction } from "@/lib/utils/next-action";

export function NextActionGuide({
  actions,
  caseId,
}: {
  actions: NextAction[];
  caseId: string;
}) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">次にやるべきこと</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            現在のフェーズでは特に必要なアクションはありません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">次にやるべきこと</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{action.title}</p>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
            {action.actionType === "follow_up_complete" ? (
              <FollowUpCompleteButton caseId={caseId} />
            ) : (
              <Link
                href={action.href}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                実行
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FollowUpCompleteButton({ caseId }: { caseId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (
      !confirm(
        "このケースのフォローを終了しますか？一覧から非表示になりますが、履歴は保持されます。"
      )
    )
      return;

    startTransition(async () => {
      await updateCasePhase(caseId, "follow_up_completed", "フォロー終了");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "処理中..." : "実行"}
    </Button>
  );
}
