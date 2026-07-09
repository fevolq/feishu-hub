CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  app_id TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_sort_order ON companies(sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS company_sync_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT,
  cron_expression TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_company_sync_schedules_company
  ON company_sync_schedules(company_id, enabled);
CREATE INDEX IF NOT EXISTS idx_company_sync_schedules_due
  ON company_sync_schedules(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  departments_count INTEGER NOT NULL DEFAULT 0,
  users_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  resigned_count INTEGER NOT NULL DEFAULT 0,
  restored_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_company ON sync_runs(company_id, started_at DESC);

CREATE TABLE IF NOT EXISTS departments (
  company_id INTEGER NOT NULL,
  open_department_id TEXT NOT NULL,
  parent_open_department_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TEXT,
  extra_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY(company_id, open_department_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(company_id, parent_open_department_id);

CREATE TABLE IF NOT EXISTS users_current (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  open_id TEXT NOT NULL,
  union_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  job_title TEXT,
  leader_open_id TEXT,
  primary_department_id TEXT,
  department_ids_json TEXT NOT NULL DEFAULT '[]',
  avatar_url TEXT,
  mobile TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  extra_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  resigned_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, open_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_current_company_status ON users_current(company_id, status);
CREATE INDEX IF NOT EXISTS idx_users_current_department ON users_current(company_id, primary_department_id);

CREATE TABLE IF NOT EXISTS user_departments (
  company_id INTEGER NOT NULL,
  user_open_id TEXT NOT NULL,
  open_department_id TEXT NOT NULL,
  PRIMARY KEY(company_id, user_open_id, open_department_id),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(company_id, open_department_id);

CREATE TABLE IF NOT EXISTS user_daily_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_open_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  job_title TEXT,
  leader_open_id TEXT,
  primary_department_id TEXT,
  department_ids_json TEXT NOT NULL DEFAULT '[]',
  captured_at TEXT NOT NULL,
  sync_run_id INTEGER,
  UNIQUE(company_id, user_open_id, snapshot_date),
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(sync_run_id) REFERENCES sync_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_company_date
  ON user_daily_snapshots(company_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_user
  ON user_daily_snapshots(company_id, user_open_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS user_change_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_open_id TEXT NOT NULL,
  type TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL,
  sync_run_id INTEGER,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(sync_run_id) REFERENCES sync_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_change_events_user ON user_change_events(company_id, user_open_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_change_events_company_time
  ON user_change_events(company_id, occurred_at DESC);
