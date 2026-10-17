CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE layouts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  shots INTEGER NOT NULL CHECK (shots IN (2, 3, 4)),
  orientation TEXT NOT NULL CHECK (orientation IN ('vertical', 'horizontal', 'grid')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE frames (
  id INTEGER PRIMARY KEY,
  layout_id INTEGER NOT NULL REFERENCES layouts (id),
  name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE filters (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  params TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(params)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  layout_id INTEGER NOT NULL REFERENCES layouts (id),
  frame_id INTEGER REFERENCES frames (id),
  filter_id INTEGER REFERENCES filters (id)
);

CREATE TABLE photos (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL CHECK (shot_number BETWEEN 1 AND 4),
  image_path TEXT NOT NULL,
  UNIQUE (session_id, shot_number)
);

CREATE TABLE strips (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions (id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  -- The share code is the only thing guarding a strip's /s/<code> link on the Wi-Fi.
  share_code TEXT NOT NULL UNIQUE CHECK (length(share_code) >= 8),
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  print_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Remove a guest by deleting their SESSION: it cascades to photos, the strip and its print jobs.
-- (Deleting only the strip row would leave the session's raw photos behind.)
CREATE TABLE print_jobs (
  id INTEGER PRIMARY KEY,
  strip_id INTEGER NOT NULL REFERENCES strips (id) ON DELETE CASCADE,
  copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- The UNIQUE constraint already indexes share_code; this named index is the one the spec lists.
CREATE INDEX idx_strips_share_code ON strips (share_code);
CREATE INDEX idx_photos_session_id ON photos (session_id);
CREATE INDEX idx_sessions_created_at ON sessions (created_at);
CREATE INDEX idx_frames_layout_id ON frames (layout_id);
CREATE INDEX idx_print_jobs_strip_id ON print_jobs (strip_id);
-- Only one filter may be the default.
CREATE UNIQUE INDEX idx_filters_one_default ON filters (is_default) WHERE is_default = 1;
