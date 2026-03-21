import { PHASES, type Phase } from "@/types/phase";

export function getPhaseLabel(phase: string): string {
  return PHASES[phase as Phase] ?? phase;
}

export function getPhaseColor(phase: string): string {
  switch (phase) {
    case "phase0_detection":
    case "phase0_monitoring":
      return "bg-yellow-100 text-yellow-800";
    case "phase1_leave_start":
      return "bg-orange-100 text-orange-800";
    case "phase2_rest":
      return "bg-blue-100 text-blue-800";
    case "phase3_preparation":
      return "bg-purple-100 text-purple-800";
    case "phase4_decision":
      return "bg-indigo-100 text-indigo-800";
    case "phase5a_full_return":
      return "bg-green-100 text-green-800";
    case "phase5b_gradual_return":
      return "bg-teal-100 text-teal-800";
    case "resolved_without_leave":
    case "closed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
