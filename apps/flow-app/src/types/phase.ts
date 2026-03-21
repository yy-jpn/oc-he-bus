export const PHASES = {
  phase0_detection: "予兆検知",
  phase0_monitoring: "予兆監視中",
  phase1_leave_start: "休職開始手続き",
  phase2_rest: "療養中",
  phase3_preparation: "復職準備中",
  phase4_decision: "復職判定",
  phase5a_full_return: "復職済（通常勤務）",
  phase5b_gradual_return: "段階的復職中",
  resolved_without_leave: "解決（休職なし）",
  closed: "完了",
} as const;

export type Phase = keyof typeof PHASES;

export const TRIGGER_TYPES = {
  attendance: "勤怠異常",
  overtime: "長時間労働",
  stress_check: "ストレスチェック高リスク",
  health_check: "健康診断結果",
  manager_report: "上司からの報告",
  self_report: "本人からの申出",
} as const;

export type TriggerType = keyof typeof TRIGGER_TYPES;

export const INTERVIEW_OUTCOMES = {
  continue_monitoring: "経過観察",
  recommend_medical: "受診勧奨",
  proceed_to_leave: "休職手続きへ",
} as const;

export type InterviewOutcome = keyof typeof INTERVIEW_OUTCOMES;

export const CONTACT_FREQUENCIES = {
  weekly: "毎週",
  biweekly: "隔週",
  monthly: "毎月",
} as const;

export const CONTACT_METHODS = {
  phone: "電話",
  email: "メール",
  in_person: "対面",
} as const;
