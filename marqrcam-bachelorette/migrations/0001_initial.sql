PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  source_row INTEGER,
  relationship_to_couple TEXT,
  unnamed_guest_slots INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  normalized_last_name TEXT NOT NULL,
  guest_type TEXT NOT NULL DEFAULT 'adult' CHECK (guest_type IN ('adult','child','plus_one')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guests_last_name ON guests(normalized_last_name, active);

CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  camera_model TEXT NOT NULL,
  current_roll INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_guest ON guest_sessions(guest_id);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  r2_original_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  camera_model TEXT NOT NULL,
  roll_number INTEGER NOT NULL,
  exposure_number INTEGER NOT NULL,
  captured_at TEXT,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edit_status TEXT NOT NULL DEFAULT 'unedited' CHECK (edit_status IN ('unedited','edited')),
  gallery_status TEXT NOT NULL DEFAULT 'private' CHECK (gallery_status IN ('private','approved','hidden')),
  edit_recipe TEXT,
  r2_developed_key TEXT,
  FOREIGN KEY (guest_id) REFERENCES guests(id),
  FOREIGN KEY (session_id) REFERENCES guest_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_photos_guest_time ON photos(guest_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_gallery ON photos(gallery_status, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS registered_plus_ones (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  normalized_last_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id)
);
