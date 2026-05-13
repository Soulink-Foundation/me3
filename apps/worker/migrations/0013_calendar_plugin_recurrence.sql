-- Calendar plugin recurrence expansion.
-- Rebuild the events table so first-party calendar events can repeat beyond birthdays.

CREATE TABLE IF NOT EXISTS user_calendar_events_next (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'owner',
  title TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'event' CHECK (kind IN ('event', 'birthday')),
  recurrence_rule TEXT CHECK (
    recurrence_rule IS NULL OR
    recurrence_rule = 'daily' OR
    recurrence_rule = 'yearly' OR
    recurrence_rule LIKE 'weekly:%' OR
    recurrence_rule LIKE 'monthly:%'
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES owner_profile(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO user_calendar_events_next (
  id, user_id, title, notes, location, starts_at, ends_at, timezone,
  all_day, kind, recurrence_rule, created_at, updated_at
)
SELECT
  id, user_id, title, notes, location, starts_at, ends_at, timezone,
  all_day, kind, recurrence_rule, created_at, updated_at
FROM user_calendar_events;

DROP TABLE user_calendar_events;

ALTER TABLE user_calendar_events_next RENAME TO user_calendar_events;

CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user_window
  ON user_calendar_events(user_id, starts_at, ends_at);
