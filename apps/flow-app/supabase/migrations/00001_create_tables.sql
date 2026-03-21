-- 休復職フロー管理システム DBスキーマ
-- Supabase Dashboard の SQL Editor で実行してください

-- 企業
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  employee_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザー（人事担当者、上司、労働者）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'manager', 'employee')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 従業員
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ケース（Phase 0で作成、全フローを通じて管理）
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  employee_id UUID REFERENCES employees(id),
  current_phase TEXT NOT NULL CHECK (current_phase IN (
    'phase0_detection', 'phase0_monitoring',
    'phase1_leave_start',
    'phase2_rest',
    'phase3_preparation',
    'phase4_decision',
    'phase5a_full_return',
    'phase5b_gradual_return',
    'closed', 'resolved_without_leave'
  )),
  trigger_type TEXT CHECK (trigger_type IN (
    'attendance', 'overtime', 'stress_check', 'health_check', 'manager_report', 'self_report'
  )),
  trigger_detail TEXT,
  detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 面談記録
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  conducted_at TIMESTAMPTZ NOT NULL,
  conducted_by UUID REFERENCES users(id),
  outcome TEXT CHECK (outcome IN ('continue_monitoring', 'recommend_medical', 'proceed_to_leave')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 休職情報
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  start_date DATE NOT NULL,
  end_date DATE,
  diagnosis_received BOOLEAN DEFAULT false,
  contact_frequency TEXT CHECK (contact_frequency IN ('weekly', 'biweekly', 'monthly')),
  contact_method TEXT CHECK (contact_method IN ('phone', 'email', 'in_person')),
  info_provided_contact_method BOOLEAN DEFAULT false,
  info_provided_social_insurance BOOLEAN DEFAULT false,
  info_provided_rest_guidance BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 連絡スケジュール・リマインド
CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- ケースイベントログ（タイムライン表示用）
CREATE TABLE case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
