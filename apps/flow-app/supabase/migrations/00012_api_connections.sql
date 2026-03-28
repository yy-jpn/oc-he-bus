-- v1.4: 外部HRアプリAPI連携テーブル

-- 2.1 hr_connections: API接続設定
CREATE TABLE hr_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  adapter_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'access_token')),
  credentials_encrypted BYTEA,
  oauth_state JSONB,
  config JSONB DEFAULT '{}',
  sync_data_types TEXT[] NOT NULL DEFAULT '{}',
  schedule TEXT NOT NULL DEFAULT 'manual' CHECK (schedule IN ('manual', 'daily', 'weekly')),
  schedule_time TIME DEFAULT '03:00',
  schedule_day_of_week INTEGER CHECK (schedule_day_of_week BETWEEN 0 AND 6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 hr_sync_logs: 同期実行ログ
CREATE TABLE hr_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES hr_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  data_types_requested TEXT[],
  data_types_succeeded TEXT[],
  data_types_failed TEXT[],
  records_fetched INTEGER DEFAULT 0,
  candidates_created INTEGER DEFAULT 0,
  cases_created INTEGER DEFAULT 0,
  cases_updated INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 hr_sync_alerts: アラート通知
CREATE TABLE hr_sync_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES hr_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  sync_log_id UUID REFERENCES hr_sync_logs(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('auth_expired', 'rate_limited', 'sync_failed', 'partial_failure')),
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 hr_data_imports に connection_id 追加
ALTER TABLE hr_data_imports ADD COLUMN connection_id UUID REFERENCES hr_connections(id);

-- インデックス
CREATE INDEX idx_hr_connections_company ON hr_connections(company_id);
CREATE INDEX idx_hr_connections_active ON hr_connections(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_hr_sync_logs_connection ON hr_sync_logs(connection_id);
CREATE INDEX idx_hr_sync_logs_company ON hr_sync_logs(company_id, started_at DESC);
CREATE INDEX idx_hr_sync_alerts_unresolved ON hr_sync_alerts(company_id, resolved) WHERE resolved = false;

-- RLS
ALTER TABLE hr_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_sync_alerts ENABLE ROW LEVEL SECURITY;

-- hr_connections: hr_admin CRUD, others SELECT
CREATE POLICY "HR admin full access to hr_connections" ON hr_connections
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company hr_connections" ON hr_connections
  FOR SELECT USING (company_id = get_user_company_id());

-- hr_sync_logs: hr_admin CRUD, others SELECT
CREATE POLICY "HR admin full access to hr_sync_logs" ON hr_sync_logs
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company hr_sync_logs" ON hr_sync_logs
  FOR SELECT USING (company_id = get_user_company_id());

-- hr_sync_alerts: hr_admin CRUD, others SELECT
CREATE POLICY "HR admin full access to hr_sync_alerts" ON hr_sync_alerts
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'hr_admin'
  );

CREATE POLICY "Others can view company hr_sync_alerts" ON hr_sync_alerts
  FOR SELECT USING (company_id = get_user_company_id());
