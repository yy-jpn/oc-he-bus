export interface DateRange {
  start: Date;
  end: Date;
}

export interface OvertimeRecord {
  employeeCode: string;
  yearMonth: string; // "2026-03"
  totalHours: number;
}

export interface StressCheckRecord {
  employeeCode: string;
  checkDate: string;
  highStress: boolean;
}

export interface HealthCheckRecord {
  employeeCode: string;
  checkDate: string;
  employmentDecision: string; // "通常勤務" | "就業制限" | "要休業" etc.
}

export interface AttendanceRecord {
  employeeCode: string;
  eventDate: string;
  eventType:
    | "tardiness"
    | "early_leave"
    | "non_pto_absence"
    | "same_day_pto"
    | "pto_absence";
  sameDayConfirmed?: boolean;
  confirmationSource?: "manual" | "api";
}

export interface CandidateProposal {
  employeeCode: string;
  triggerType: string;
  triggerDetail: string;
  thresholdRule: string;
  sourceRecordIds: string[];
}

export interface ThresholdParameters {
  threshold?: number;
  consecutive_months?: number;
  event_count?: number;
  period_weeks?: number;
  enabled_event_types?: string[];
}

export interface AttendanceConfig {
  scheduledStartTime: string;    // "09:00" (HH:MM)
  scheduledWorkMinutes: number;  // 480
  flexTimeEnabled: boolean;      // false
}

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  scheduledStartTime: "09:00",
  scheduledWorkMinutes: 480,
  flexTimeEnabled: false,
};

export interface ThresholdSetting {
  ruleKey: string;
  triggerType: string;
  enabled: boolean;
  autoApprove: boolean;
  parameters: ThresholdParameters;
}
