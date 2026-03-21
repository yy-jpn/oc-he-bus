import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPhaseLabel } from "@/lib/utils/phase";

const displayPhases = [
  "phase0_monitoring",
  "phase1_leave_start",
  "phase2_rest",
  "phase3_preparation",
  "phase4_decision",
  "phase5b_gradual_return",
] as const;

export function PhaseSummary({ summary }: { summary: Record<string, number> }) {
  const totalActive = Object.entries(summary)
    .filter(([phase]) => !["closed", "resolved_without_leave", "phase5a_full_return"].includes(phase))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            対応中ケース合計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive}件</div>
        </CardContent>
      </Card>
      {displayPhases.map((phase) => {
        const count = summary[phase] || 0;
        if (count === 0) return null;
        return (
          <Card key={phase}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getPhaseLabel(phase)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}件</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
