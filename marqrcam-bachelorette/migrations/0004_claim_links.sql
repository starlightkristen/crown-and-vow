PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS guest_claim_links (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  camera_model TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_links_guest ON guest_claim_links(guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_links_active ON guest_claim_links(revoked_at, expires_at, use_count, max_uses);
