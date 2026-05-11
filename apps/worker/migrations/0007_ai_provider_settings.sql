CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  encrypted_api_key TEXT,
  api_key_hint TEXT,
  api_key_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, provider_id),
  FOREIGN KEY (user_id) REFERENCES owner_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_model_defaults (
  user_id TEXT NOT NULL,
  use_case TEXT NOT NULL CHECK (use_case IN ('default', 'chat', 'reasoning', 'extraction')),
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, use_case),
  FOREIGN KEY (user_id) REFERENCES owner_profile(id) ON DELETE CASCADE
);
