-- HR連携機能: テーブル作成、RLS、デフォルト閾値

-- 1.1 employeesテーブルにemployee_code追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_code
  ON employees(company_id, employee_code) WHERE employee_code IS NOT NULL;

-- 1.2 新規テーブル

-- hr_data_imports: インポートバッチ管理
CREATE TABLE hr_data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  source_type TEXT NOT NULL DEFAULT 'csv',
  data_type TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- hr_data_records: 取込生データ
CREATE TABLE hr_data_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES hr_data_imports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_code TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id),
  data_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- case_candidates: 承認待ちキュー
CREATE TABLE case_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  trigger_type TEXT NOT NULL,
  trigger_detail TEXT,
  threshold_rule TEXT NOT NULL,
  source_record_ids UUID[],
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_case_id UUID REFERENCES cases(id),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- threshold_settings: 閾値設定
CREATE TABLE threshold_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  trigger_type TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, rule_key)
);

-- インデックス
CREATE INDEX idx_hr_data_records_import ON hr_data_records(import_id);
CREATE INDEX idx_hr_data_records_employee ON hr_data_records(company_id, employee_code);
CREATE INDEX idx_case_candidates_status ON case_candidates(company_id, status);
CREATE INDEX idx_threshold_settings_company ON threshold_settings(company_id);

-- 1.3 RLSポリシー

ALTER TABLE hr_data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE threshold_settings ENABLE ROW LEVEL SECURITY;

-- hr_data_imports: hr_admin CRUD, others SELECT
CREATE POLICY "HR admin full access to hr_data_imports" ON hr_data_imports
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company hr_data_imports" ON hr_data_imports
  FOR SELECT USING (company_id = get_user_company_id());

-- hr_data_records: hr_admin CRUD, others SELECT
CREATE POLICY "HR admin full access to hr_data_records" ON hr_data_records
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company hr_data_records" ON hr_data_records
  FOR SELECT USING (company_id = get_user_company_id());

-- case_candidates: hr_admin only INSERT/UPDATE, company SELECT
CREATE POLICY "HR admin full access to case_candidates" ON case_candidates
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company case_candidates" ON case_candidates
  FOR SELECT USING (company_id = get_user_company_id());

-- threshold_settings: hr_admin only CRUD
CREATE POLICY "HR admin full access to threshold_settings" ON threshold_settings
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company threshold_settings" ON threshold_settings
  FOR SELECT USING (company_id = get_user_company_id());

-- 1.4 デフォルト閾値seed用関数
-- 会社作成時にデフォルト閾値を挿入するトリガー関数
CREATE OR REPLACE FUNCTION insert_default_thresholds()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO threshold_settings (company_id, trigger_type, rule_key, parameters) VALUES
    (NEW.id, 'overtime', 'overtime_single_month', '{"threshold": 80}'),
    (NEW.id, 'overtime', 'overtime_consecutive', '{"threshold": 45, "consecutive_months": 2}'),
    (NEW.id, 'stress_check', 'stress_check_high', '{}'),
    (NEW.id, 'health_check', 'health_check_non_normal', '{}'),
    (NEW.id, 'attendance', 'attendance_multiple_events', '{"event_count": 2, "period_weeks": 4}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insert_default_thresholds
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION insert_default_thresholds();

-- 既存の会社にもデフォルト閾値を挿入
INSERT INTO threshold_settings (company_id, trigger_type, rule_key, parameters)
SELECT c.id, vals.trigger_type, vals.rule_key, vals.parameters::jsonb
FROM companies c
CROSS JOIN (VALUES
  ('overtime', 'overtime_single_month', '{"threshold": 80}'),
  ('overtime', 'overtime_consecutive', '{"threshold": 45, "consecutive_months": 2}'),
  ('stress_check', 'stress_check_high', '{}'),
  ('health_check', 'health_check_non_normal', '{}'),
  ('attendance', 'attendance_multiple_events', '{"event_count": 2, "period_weeks": 4}')
) AS vals(trigger_type, rule_key, parameters)
ON CONFLICT (company_id, rule_key) DO NOTHING;
