"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { getDataTypeLabel } from "@/lib/hr-integration/adapters/registry";

const ALL_DATA_TYPES = ["overtime", "attendance", "health_check", "stress_check"];

interface DataCoverageBannerProps {
  coveredDataTypes: string[];
}

export function DataCoverageBanner({ coveredDataTypes }: DataCoverageBannerProps) {
  const uncovered = ALL_DATA_TYPES.filter((dt) => !coveredDataTypes.includes(dt));

  if (uncovered.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠</span>
          <div className="space-y-2">
            <p className="font-medium text-sm">
              データカバレッジに不足があります
            </p>
            <p className="text-sm text-muted-foreground">
              現在の接続構成では以下のデータが取得できません:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-4">
              {uncovered.map((dt) => (
                <li key={dt}>{getDataTypeLabel(dt)}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              SmartHRとの連携を追加するか、CSVインポートをご利用ください。
            </p>
            <div className="flex gap-2 pt-1">
              <Link
                href="/settings/connections/new"
                className={buttonVariants({ size: "sm" })}
              >
                接続を追加
              </Link>
              <Link
                href="/settings/import"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                CSVインポートへ
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
