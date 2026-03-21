-- 開発用シードデータ
-- Supabase Dashboard の SQL Editor で実行してください
-- 注意: auth.users は Supabase Dashboard > Authentication で手動作成後、
-- このスクリプトで users テーブルの company_id, name, role を更新してください

-- 1. 企業を作成
INSERT INTO companies (id, name, employee_count)
VALUES ('a0000000-0000-0000-0000-000000000001', 'テスト株式会社', 30);

-- 2. 従業員マスタを作成
INSERT INTO employees (id, company_id, name, department, position)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '山田太郎', '営業部', '主任'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '佐藤花子', '総務部', '一般'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '鈴木一郎', '開発部', 'エンジニア');

-- 3. サンプルケースを作成（usersテーブルにhr_adminユーザーが存在する必要あり）
-- 注意: 以下はauth.usersからusersテーブルへの紐付け後に実行してください
-- 手順:
--   1) Supabase Dashboard > Authentication > Add user で3ユーザーを作成
--   2) 作成された auth.users の UUID をメモ
--   3) users テーブルの company_id, name, role を UPDATE
--   4) 下記のINSERT文を実行

-- サンプルケース（hr_adminユーザー設定後に実行）
-- INSERT INTO cases (company_id, employee_id, current_phase, trigger_type, trigger_detail, detected_at)
-- VALUES
--   ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'phase0_monitoring', 'attendance', '直近1ヶ月で遅刻5回、欠勤2回', now() - interval '10 days'),
--   ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'phase2_rest', 'self_report', '本人からの休職希望の申出', now() - interval '45 days');
