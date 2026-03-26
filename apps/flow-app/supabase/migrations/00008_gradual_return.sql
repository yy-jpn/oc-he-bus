-- 段階的復職スケジュール（Phase 5Bのみ）
CREATE TABLE gradual_schedule_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  step_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  work_hours_per_day NUMERIC(3,1),
  work_days_per_week INT,
  duty_adjustments TEXT,
  review_date DATE,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed')) DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 再発防止計画（Phase 5Bのみ）
CREATE TABLE relapse_prevention_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  workplace_adjustments TEXT[],
  identified_stressors TEXT[],
  countermeasures TEXT[],
  monitoring_items TEXT[],
  monitoring_frequency TEXT CHECK (monitoring_frequency IN ('weekly', 'biweekly', 'monthly')),
  monitoring_duration_months INT,
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for gradual_schedule_steps
ALTER TABLE gradual_schedule_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gradual_steps_select" ON gradual_schedule_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = gradual_schedule_steps.return_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "gradual_steps_insert" ON gradual_schedule_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = gradual_schedule_steps.return_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

CREATE POLICY "gradual_steps_update" ON gradual_schedule_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = gradual_schedule_steps.return_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

CREATE POLICY "gradual_steps_delete" ON gradual_schedule_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = gradual_schedule_steps.return_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

-- RLS for relapse_prevention_plans
ALTER TABLE relapse_prevention_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prevention_plans_select" ON relapse_prevention_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = relapse_prevention_plans.return_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "prevention_plans_insert" ON relapse_prevention_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = relapse_prevention_plans.return_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

CREATE POLICY "prevention_plans_update" ON relapse_prevention_plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM returns r
      JOIN leaves l ON l.id = r.leave_id
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE r.id = relapse_prevention_plans.return_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );
