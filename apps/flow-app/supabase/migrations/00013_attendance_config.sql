-- P2: 従業員別の勤怠判定設定カラム追加
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS attendance_config JSONB DEFAULT NULL;

COMMENT ON COLUMN employees.attendance_config IS
  '個人別の勤怠判定設定。NULLの場合は接続の全体設定にフォールバック。
   {"scheduledStartTime":"10:00","scheduledWorkMinutes":420,"flexTimeEnabled":true}';

-- P1: 既存の attendance_multiple_events ルールに enabled_event_types 初期値を投入
UPDATE threshold_settings
SET parameters = parameters || '{"enabled_event_types": ["tardiness", "early_leave", "non_pto_absence", "same_day_pto"]}'::jsonb
WHERE rule_key = 'attendance_multiple_events'
  AND NOT (parameters ? 'enabled_event_types');
