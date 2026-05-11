CREATE TABLE IF NOT EXISTS plugin_installations (
  plugin_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'installed'
    CHECK (status IN ('installed', 'setup_required', 'disabled')),
  granted_permissions_json TEXT NOT NULL DEFAULT '[]',
  setup_state_json TEXT NOT NULL DEFAULT '{}',
  installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
