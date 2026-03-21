import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import type { NextAction } from "@/lib/utils/next-action";

export function NextActionGuide({ actions }: { actions: NextAction[] }) {
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
            <Link
              href={action.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              実行
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
