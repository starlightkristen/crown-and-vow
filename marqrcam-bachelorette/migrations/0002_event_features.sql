PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS event_settings (
  id TEXT PRIMARY KEY,
  capture_enabled INTEGER NOT NULL DEFAULT 1 CHECK (capture_enabled IN (0,1)),
  gallery_enabled INTEGER NOT NULL DEFAULT 1 CHECK (gallery_enabled IN (0,1)),
  ceremony_message TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO event_settings (id, capture_enabled, gallery_enabled, ceremony_message)
VALUES ('wedding', 1, 1, 'The cameras are resting during the ceremony.');

ALTER TABLE registered_plus_ones ADD COLUMN sponsor_guest_id TEXT;
ALTER TABLE registered_plus_ones ADD COLUMN guest_id TEXT;
ALTER TABLE registered_plus_ones ADD COLUMN slot_index INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plus_one_guest ON registered_plus_ones(guest_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plus_one_household_slot ON registered_plus_ones(household_id, slot_index);
CREATE INDEX IF NOT EXISTS idx_plus_one_sponsor ON registered_plus_ones(sponsor_guest_id);

CREATE INDEX IF NOT EXISTS idx_photos_session_exposure ON photos(session_id, exposure_number DESC);
