CREATE TABLE IF NOT EXISTS assistant_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  recipe_id TEXT,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'needs_setup', 'failing', 'archived')),
  current_version_id TEXT,
  project_id TEXT,
  destination_json TEXT NOT NULL DEFAULT '{}',
  trigger_summary TEXT NOT NULL DEFAULT 'Manual',
  next_run_at TEXT,
  last_run_at TEXT,
  last_run_status TEXT CHECK (last_run_status IN ('queued', 'running', 'waiting_for_approval', 'succeeded', 'failed', 'cancelled', 'blocked')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  setup_state_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT 'owner'
    CHECK (created_by IN ('owner', 'assistant')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_assistant_jobs_user_status
  ON assistant_jobs(user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_assistant_jobs_user_next_run
  ON assistant_jobs(user_id, status, next_run_at);

CREATE TABLE IF NOT EXISTS assistant_job_versions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'owner',
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  trigger_json TEXT NOT NULL,
  scope_json TEXT NOT NULL DEFAULT '{}',
  rules_json TEXT NOT NULL DEFAULT '[]',
  actions_json TEXT NOT NULL DEFAULT '[]',
  approval_policy_json TEXT NOT NULL DEFAULT '{}',
  destination_json TEXT NOT NULL DEFAULT '{}',
  capability_ids_json TEXT NOT NULL DEFAULT '[]',
  permission_summary_json TEXT NOT NULL DEFAULT '{}',
  recommended_skill_ids_json TEXT NOT NULL DEFAULT '[]',
  required_skill_ids_json TEXT NOT NULL DEFAULT '[]',
  validation_status TEXT NOT NULL DEFAULT 'valid'
    CHECK (validation_status IN ('valid', 'invalid', 'needs_setup')),
  validation_errors_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, version_number),
  FOREIGN KEY (job_id) REFERENCES assistant_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_versions_job_created
  ON assistant_job_versions(job_id, created_at);

CREATE TABLE IF NOT EXISTS assistant_job_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  job_id TEXT NOT NULL,
  job_version_id TEXT NOT NULL,
  trigger_kind TEXT NOT NULL
    CHECK (trigger_kind IN ('manual', 'schedule', 'event', 'heartbeat_retry')),
  trigger_ref TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'waiting_for_approval', 'succeeded', 'failed', 'cancelled', 'blocked')),
  started_at TEXT,
  finished_at TEXT,
  output_preview TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES assistant_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (job_version_id) REFERENCES assistant_job_versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_runs_job_created
  ON assistant_job_runs(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_job_runs_user_status
  ON assistant_job_runs(user_id, status, created_at);

CREATE TABLE IF NOT EXISTS assistant_job_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES assistant_job_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_run_events_run_created
  ON assistant_job_run_events(run_id, created_at);

CREATE TABLE IF NOT EXISTS assistant_job_artifacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  job_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('review_packet', 'draft', 'summary', 'extraction', 'file_ref', 'provider_ref')),
  title TEXT NOT NULL,
  preview TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  mission_control_ref TEXT,
  provider_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES assistant_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES assistant_job_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_artifacts_run_kind
  ON assistant_job_artifacts(run_id, kind);

CREATE TABLE IF NOT EXISTS assistant_job_action_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('skipped', 'blocked', 'pending_approval', 'succeeded', 'failed')),
  approval_id TEXT,
  artifact_id TEXT,
  external_ref TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, action_id, idempotency_key),
  FOREIGN KEY (run_id) REFERENCES assistant_job_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_action_results_run_status
  ON assistant_job_action_results(run_id, status);

CREATE TABLE IF NOT EXISTS assistant_job_ingress_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  source_kind TEXT NOT NULL
    CHECK (source_kind IN ('core', 'mission_control', 'plugin', 'webhook')),
  source_id TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  raw_payload_ref TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'matched', 'queued', 'processed', 'ignored', 'failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_assistant_job_ingress_events_user_status
  ON assistant_job_ingress_events(user_id, status, created_at);
