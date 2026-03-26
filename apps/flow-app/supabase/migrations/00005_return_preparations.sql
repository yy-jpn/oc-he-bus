-- 復職準備テーブル
CREATE TABLE return_preparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  started_at DATE,
  rework_enrolled BOOLEAN DEFAULT false,
  rework_facility_name TEXT,
  rework_status TEXT CHECK (rework_status IN ('in_progress', 'completed', 'not_applicable')),
  checklist_l1_return_intention BOOLEAN DEFAULT false,
  checklist_l2_doctor_clearance BOOLEAN DEFAULT false,
  checklist_l3_self_care BOOLEAN DEFAULT false,
  checklist_l4_communication BOOLEAN DEFAULT false,
  checklist_l5_work_performance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE return_preparations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return_preparations_select" ON return_preparations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_preparations.leave_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "return_preparations_insert" ON return_preparations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_preparations.leave_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );

CREATE POLICY "return_preparations_update" ON return_preparations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = return_preparations.leave_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );
