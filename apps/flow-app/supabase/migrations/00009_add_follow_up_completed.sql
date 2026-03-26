-- フォロー終了フェーズを追加
ALTER TABLE cases DROP CONSTRAINT cases_current_phase_check;
ALTER TABLE cases ADD CONSTRAINT cases_current_phase_check
  CHECK (current_phase IN (
    'phase0_detection', 'phase0_monitoring',
    'phase1_leave_start',
    'phase2_rest',
    'phase3_preparation',
    'phase4_decision',
    'phase5a_full_return',
    'phase5b_gradual_return',
    'closed', 'resolved_without_leave', 'follow_up_completed'
  ));
