import type {
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
  CandidateProposal,
  ThresholdSetting,
} from "../types";
import {
  checkOvertimeSingleMonth,
  checkOvertimeConsecutive,
} from "./rules/overtime";
import { checkStressCheckHigh } from "./rules/stress-check";
import { checkHealthCheckNonNormal } from "./rules/health-check";
import { checkAttendanceMultipleEvents } from "./rules/attendance";

export interface ThresholdEngineInput {
  overtimeRecords: OvertimeRecord[];
  stressCheckRecords: StressCheckRecord[];
  healthCheckRecords: HealthCheckRecord[];
  attendanceRecords: AttendanceRecord[];
  settings: ThresholdSetting[];
  existingKeys: Set<string>; // "employeeCode:triggerType" for dedup
}

function getSettingByRule(
  settings: ThresholdSetting[],
  ruleKey: string
): ThresholdSetting | undefined {
  return settings.find((s) => s.ruleKey === ruleKey);
}

function dedupKey(proposal: CandidateProposal): string {
  return `${proposal.employeeCode}:${proposal.triggerType}`;
}

export function runThresholdEngine(
  input: ThresholdEngineInput
): CandidateProposal[] {
  const allProposals: CandidateProposal[] = [];

  // Overtime - single month
  const singleMonthSetting = getSettingByRule(
    input.settings,
    "overtime_single_month"
  );
  if (singleMonthSetting?.enabled !== false) {
    allProposals.push(
      ...checkOvertimeSingleMonth(
        input.overtimeRecords,
        singleMonthSetting?.parameters ?? { threshold: 80 }
      )
    );
  }

  // Overtime - consecutive
  const consecutiveSetting = getSettingByRule(
    input.settings,
    "overtime_consecutive"
  );
  if (consecutiveSetting?.enabled !== false) {
    allProposals.push(
      ...checkOvertimeConsecutive(
        input.overtimeRecords,
        consecutiveSetting?.parameters ?? {
          threshold: 45,
          consecutive_months: 2,
        }
      )
    );
  }

  // Stress check
  const stressSetting = getSettingByRule(input.settings, "stress_check_high");
  if (stressSetting?.enabled !== false) {
    allProposals.push(...checkStressCheckHigh(input.stressCheckRecords));
  }

  // Health check
  const healthSetting = getSettingByRule(
    input.settings,
    "health_check_non_normal"
  );
  if (healthSetting?.enabled !== false) {
    allProposals.push(...checkHealthCheckNonNormal(input.healthCheckRecords));
  }

  // Attendance
  const attendanceSetting = getSettingByRule(
    input.settings,
    "attendance_multiple_events"
  );
  if (attendanceSetting?.enabled !== false) {
    allProposals.push(
      ...checkAttendanceMultipleEvents(
        input.attendanceRecords,
        attendanceSetting?.parameters ?? { event_count: 2, period_weeks: 4 }
      )
    );
  }

  // Deduplicate: skip if same employee+triggerType already exists
  const seen = new Set<string>(input.existingKeys);
  const deduplicated: CandidateProposal[] = [];

  for (const proposal of allProposals) {
    const key = dedupKey(proposal);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(proposal);
    }
  }

  return deduplicated;
}
