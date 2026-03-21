import { Badge } from "@/components/ui/badge";
import { getPhaseLabel, getPhaseColor } from "@/lib/utils/phase";

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <Badge variant="secondary" className={getPhaseColor(phase)}>
      {getPhaseLabel(phase)}
    </Badge>
  );
}
