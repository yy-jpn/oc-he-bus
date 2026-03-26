-- 復職判定テーブル（職業準備性ピラミッド準拠）
CREATE TABLE return_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  decided_at DATE,
  decision TEXT CHECK (decision IN ('approved_full', 'approved_gradual', 'deferred')),
  -- L1: 復職の意思
  l1_return_intention BOOLEAN DEFAULT false,
  l1_intention_expressed_at DATE,
  l1_intention_confirmed_by UUID REFERENCES users(id),
  -- L2: 主治医の復職可能診断書
  l2_doctor_clearance BOOLEAN DEFAULT false,
  l2_symptom_stable BOOLEAN DEFAULT false,
  l2_episode_recall_tolerance BOOLEAN DEFAULT false,
  l2_clearance_received_at DATE,
  -- L3: セルフケアの確立
  l3_life_rhythm_stable BOOLEAN DEFAULT false,
  l3_medication_self_managed BOOLEAN DEFAULT false,
  l3_grooming_adequate BOOLEAN DEFAULT false,
  l3_daily_outing_possible BOOLEAN DEFAULT false,
  l3_eating_adequate BOOLEAN DEFAULT false,
  -- L4: コミュニケーション
  l4_family_friends_ok BOOLEAN DEFAULT false,
  l4_strangers_ok BOOLEAN DEFAULT false,
  l4_rework_staff_ok BOOLEAN,
  l4_hr_interview_ok BOOLEAN DEFAULT false,
  -- L5: 業務遂行能力
  l5_attendance_stable BOOLEAN DEFAULT false,
  l5_task_performance_ok BOOLEAN DEFAULT false,
  l5_concentration_adequate BOOLEAN DEFAULT false,
  l5_commute_training_ok BOOLEAN DEFAULT false,
  l5_rework_completion BOOLEAN,
  -- 地域産業保健センター
  regional_ohc_consulted BOOLEAN DEFAULT false,
  regional_ohc_opinion TEXT,
  -- メタ
  decided_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE return_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return_decisions_select" ON return_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_decisions.leave_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "return_decisions_insert" ON return_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_decisions.leave_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

CREATE POLICY "return_decisions_update" ON return_decisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_decisions.leave_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );
