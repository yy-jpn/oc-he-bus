-- RLSポリシー
-- Supabase Dashboard の SQL Editor で実行してください

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- companies: users can see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (id = get_user_company_id());

-- users: users can see users in their company
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (company_id = get_user_company_id());

-- employees: users can see employees in their company
CREATE POLICY "Users can view company employees" ON employees
  FOR SELECT USING (company_id = get_user_company_id());

-- cases: hr_admin can CRUD, others can view
CREATE POLICY "HR admin full access to cases" ON cases
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company cases" ON cases
  FOR SELECT USING (company_id = get_user_company_id());

-- interviews: hr_admin can CRUD
CREATE POLICY "HR admin full access to interviews" ON interviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = interviews.case_id
      AND cases.company_id = get_user_company_id()
    )
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company interviews" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = interviews.case_id
      AND cases.company_id = get_user_company_id()
    )
  );

-- leaves: hr_admin can CRUD
CREATE POLICY "HR admin full access to leaves" ON leaves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = leaves.case_id
      AND cases.company_id = get_user_company_id()
    )
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company leaves" ON leaves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = leaves.case_id
      AND cases.company_id = get_user_company_id()
    )
  );

-- contact_reminders: hr_admin can CRUD
CREATE POLICY "HR admin full access to contact_reminders" ON contact_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leaves
      JOIN cases ON cases.id = leaves.case_id
      WHERE leaves.id = contact_reminders.leave_id
      AND cases.company_id = get_user_company_id()
    )
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company reminders" ON contact_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaves
      JOIN cases ON cases.id = leaves.case_id
      WHERE leaves.id = contact_reminders.leave_id
      AND cases.company_id = get_user_company_id()
    )
  );

-- case_events: hr_admin can CRUD, others can view
CREATE POLICY "HR admin full access to case_events" ON case_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_events.case_id
      AND cases.company_id = get_user_company_id()
    )
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company events" ON case_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_events.case_id
      AND cases.company_id = get_user_company_id()
    )
  );
