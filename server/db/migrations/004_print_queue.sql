-- The booth screen claims a queued job before printing it, so a job is printed once even
-- if two booth tabs are open. SQLite cannot change a CHECK, so the table is rebuilt.
CREATE TABLE print_jobs_new (
  id INTEGER PRIMARY KEY,
  strip_id INTEGER NOT NULL REFERENCES strips (id) ON DELETE CASCADE,
  copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printing', 'printed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO print_jobs_new (id, strip_id, copies, status, created_at)
  SELECT id, strip_id, copies, status, created_at FROM print_jobs;
DROP TABLE print_jobs;
ALTER TABLE print_jobs_new RENAME TO print_jobs;
CREATE INDEX idx_print_jobs_strip_id ON print_jobs (strip_id);
CREATE INDEX idx_print_jobs_status ON print_jobs (status, id);

-- The gallery lists public strips, newest first.
CREATE INDEX idx_strips_public_created ON strips (is_public, created_at);

-- '4x6': two copies of the strip side by side on 4x6 photo paper, cut in half (most photo
-- printers). '2x6': one strip on 2x6 paper (printers with a strip cutter).
INSERT INTO settings (key, value) VALUES ('print_paper', '4x6');
