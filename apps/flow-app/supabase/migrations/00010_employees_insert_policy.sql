-- hr_admin が自社の従業員を追加できるようにする
CREATE POLICY "HR admin can insert company employees" ON employees
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );
