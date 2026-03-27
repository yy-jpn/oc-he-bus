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
  eventType: "tardiness" | "early_leave" | "non_pto_absence" | "same_day_pto";
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
}

export interface ThresholdSetting {
  ruleKey: string;
  triggerType: string;
  enabled: boolean;
  autoApprove: boolean;
  parameters: ThresholdParameters;
}
