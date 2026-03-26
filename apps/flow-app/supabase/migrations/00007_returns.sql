-- 復職記録テーブル
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  return_type TEXT CHECK (return_type IN ('full_duty', 'gradual')),
  return_date DATE NOT NULL,
  department TEXT,
  position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns_select" ON returns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = returns.leave_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "returns_insert" ON returns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaves l
      JOIN cases c ON c.id = l.case_id
      JOIN users u ON u.company_id = c.company_id
      WHERE l.id = returns.leave_id
        AND u.id = auth.uid()
        AND u.role = 'hr_admin'
    )
  );
