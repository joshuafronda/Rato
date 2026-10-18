-- Signed-in admin devices. Only a hash of the cookie token is stored.
CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);
