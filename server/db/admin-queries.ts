import { type Database, inTransaction } from './connection.ts'

export interface AdminRow {
  id: number
  username: string
  password_hash: string
}

export interface AdminLayoutRow {
  id: number
  name: string
  shots: number
  orientation: string
  active: number
}

export interface AdminFrameRow {
  id: number
  layout_id: number
  name: string
  image_path: string
  active: number
  sort_order: number
}

export interface AdminFilterRow {
  id: number
  name: string
  active: number
  is_default: number
}

export interface AdminStripRow {
  id: number
  session_id: number
  share_code: string
  is_public: number
  print_count: number
  created_at: string
}

export interface PrintJobRow {
  id: number
  copies: number
  status: string
  created_at: string
  share_code: string
}

export interface StatsRow {
  sessions_today: number
  total_strips: number
  total_prints: number
}

// --- admins and their sessions ---

export function countAdmins(db: Database): number {
  return Number(db.prepare('SELECT COUNT(*) AS n FROM admins').get()?.n)
}

export function insertAdmin(db: Database, username: string, passwordHash: string): number {
  return Number(db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, passwordHash).lastInsertRowid)
}

export function findAdminByUsername(db: Database, username: string): AdminRow | undefined {
  return db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get(username) as unknown as
    | AdminRow
    | undefined
}

export function insertAdminSession(db: Database, adminId: number, tokenHash: string, expiresAt: string): void {
  db.prepare('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, ?)').run(adminId, tokenHash, expiresAt)
}

export function findAdminBySession(db: Database, tokenHash: string): { id: number; username: string } | undefined {
  return db
    .prepare(
      `SELECT admins.id, admins.username FROM admin_sessions JOIN admins ON admins.id = admin_sessions.admin_id
       WHERE admin_sessions.token_hash = ? AND admin_sessions.expires_at > datetime('now')`,
    )
    .get(tokenHash) as unknown as { id: number; username: string } | undefined
}

export function deleteAdminSession(db: Database, tokenHash: string): void {
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash)
}

export function deleteExpiredAdminSessions(db: Database): void {
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')").run()
}

// --- overview ---

export function readStats(db: Database): StatsRow {
  return db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM sessions
          WHERE date(created_at, 'localtime') = date('now', 'localtime')) AS sessions_today,
         (SELECT COUNT(*) FROM strips) AS total_strips,
         (SELECT COALESCE(SUM(print_count), 0) FROM strips) AS total_prints`,
    )
    .get() as unknown as StatsRow
}

export function busiestHours(db: Database, limit: number): Array<{ hour: number; sessions: number }> {
  return db
    .prepare(
      `SELECT CAST(strftime('%H', created_at, 'localtime') AS INTEGER) AS hour, COUNT(*) AS sessions
       FROM sessions GROUP BY hour ORDER BY sessions DESC, hour LIMIT ?`,
    )
    .all(limit) as unknown as Array<{ hour: number; sessions: number }>
}

export function mostUsedFrame(db: Database): { name: string; sessions: number } | undefined {
  return db
    .prepare(
      `SELECT frames.name, COUNT(*) AS sessions FROM sessions JOIN frames ON frames.id = sessions.frame_id
       GROUP BY frames.id ORDER BY sessions DESC, frames.id LIMIT 1`,
    )
    .get() as unknown as { name: string; sessions: number } | undefined
}

// --- layouts, frames, filters ---

export function listAllLayouts(db: Database): AdminLayoutRow[] {
  return db.prepare('SELECT id, name, shots, orientation, active FROM layouts ORDER BY shots, id').all() as unknown as AdminLayoutRow[]
}

export function setLayoutActive(db: Database, id: number, active: boolean): boolean {
  return Number(db.prepare('UPDATE layouts SET active = ? WHERE id = ?').run(active ? 1 : 0, id).changes) > 0
}

export function listAllFrames(db: Database): AdminFrameRow[] {
  return db
    .prepare('SELECT id, layout_id, name, image_path, active, sort_order FROM frames ORDER BY layout_id, sort_order, id')
    .all() as unknown as AdminFrameRow[]
}

export function insertFrame(db: Database, layoutId: number, name: string, imagePath: string): number {
  const result = db
    .prepare(
      `INSERT INTO frames (layout_id, name, image_path, sort_order)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM frames WHERE layout_id = ?))`,
    )
    .run(layoutId, name, imagePath, layoutId)
  return Number(result.lastInsertRowid)
}

export function updateFrame(db: Database, id: number, changes: { name?: string; active?: boolean }): boolean {
  const result = db
    .prepare('UPDATE frames SET name = COALESCE(?, name), active = COALESCE(?, active) WHERE id = ?')
    .run(changes.name ?? null, changes.active === undefined ? null : Number(changes.active), id)
  return Number(result.changes) > 0
}

export function frameIdsForLayout(db: Database, layoutId: number): number[] {
  return db.prepare('SELECT id FROM frames WHERE layout_id = ?').all(layoutId).map((row) => Number(row.id))
}

export function setFrameOrder(db: Database, ids: number[]): void {
  const update = db.prepare('UPDATE frames SET sort_order = ? WHERE id = ?')
  inTransaction(db, () => ids.forEach((id, index) => update.run(index + 1, id)))
}

export function listAllFilters(db: Database): AdminFilterRow[] {
  return db.prepare('SELECT id, name, active, is_default FROM filters ORDER BY id').all() as unknown as AdminFilterRow[]
}

export function findFilter(db: Database, id: number): AdminFilterRow | undefined {
  return db.prepare('SELECT id, name, active, is_default FROM filters WHERE id = ?').get(id) as unknown as
    | AdminFilterRow
    | undefined
}

export function setFilterActive(db: Database, id: number, active: boolean): void {
  db.prepare('UPDATE filters SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
}

// The default filter is always active; making a filter the default also turns it on.
export function setDefaultFilter(db: Database, id: number): void {
  inTransaction(db, () => {
    db.prepare('UPDATE filters SET is_default = 0 WHERE is_default = 1').run()
    db.prepare('UPDATE filters SET is_default = 1, active = 1 WHERE id = ?').run(id)
  })
}

// --- strips and prints ---

export function setStripPublicById(db: Database, id: number, isPublic: boolean): boolean {
  return Number(db.prepare('UPDATE strips SET is_public = ? WHERE id = ?').run(isPublic ? 1 : 0, id).changes) > 0
}

export function findStripById(db: Database, id: number): { session_id: number; share_code: string } | undefined {
  return db.prepare('SELECT session_id, share_code FROM strips WHERE id = ?').get(id) as unknown as
    | { session_id: number; share_code: string }
    | undefined
}

// Every file a session left on disk: its shots and its strip.
export function sessionFiles(db: Database, sessionId: number): { photos: string[]; strip: string | undefined } {
  const photos = db.prepare('SELECT image_path FROM photos WHERE session_id = ?').all(sessionId).map((row) => String(row.image_path))
  const strip = db.prepare('SELECT image_path FROM strips WHERE session_id = ?').get(sessionId)
  return { photos, strip: strip ? String(strip.image_path) : undefined }
}

// Deleting the session cascades to its photos, strip and print jobs.
export function deleteSession(db: Database, sessionId: number): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
}

export function sessionsOlderThan(db: Database, days: number): number[] {
  return db
    .prepare("SELECT id FROM sessions WHERE created_at < datetime('now', ?)")
    .all(`-${days} days`)
    .map((row) => Number(row.id))
}

export function listPrintJobs(db: Database, limit: number): PrintJobRow[] {
  return db
    .prepare(
      `SELECT print_jobs.id, print_jobs.copies, print_jobs.status, print_jobs.created_at, strips.share_code
       FROM print_jobs JOIN strips ON strips.id = print_jobs.strip_id
       ORDER BY print_jobs.id DESC LIMIT ?`,
    )
    .all(limit) as unknown as PrintJobRow[]
}

export function findPrintJob(db: Database, id: number): { strip_id: number; copies: number } | undefined {
  return db.prepare('SELECT strip_id, copies FROM print_jobs WHERE id = ?').get(id) as unknown as
    | { strip_id: number; copies: number }
    | undefined
}

// --- settings ---

export function readAllSettings(db: Database): Map<string, string> {
  return new Map(db.prepare('SELECT key, value FROM settings').all().map((row) => [String(row.key), String(row.value)]))
}

export function writeSettings(db: Database, values: Map<string, string>): void {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
  )
  inTransaction(db, () => {
    for (const [key, value] of values) upsert.run(key, value)
  })
}

export function snapshotDatabase(db: Database, path: string): void {
  db.prepare('VACUUM INTO ?').run(path)
}

// --- downloads by day (days are the laptop's local dates) ---

export interface DownloadStripRow {
  share_code: string
  image_path: string
  day: string
  time: string
}

export interface DownloadPhotoRow {
  share_code: string
  shot_number: number
  image_path: string
  day: string
  time: string
}

// One day ('YYYY-MM-DD'), or every day when day is null.
const DAY_FILTER = "(? IS NULL OR date(strips.created_at, 'localtime') = ?)"

export function stripDays(db: Database): Array<{ day: string; strips: number }> {
  return db
    .prepare(
      `SELECT date(created_at, 'localtime') AS day, COUNT(*) AS strips FROM strips
       GROUP BY day ORDER BY day DESC`,
    )
    .all() as unknown as Array<{ day: string; strips: number }>
}

export function listStripsOnDay(db: Database, day: string | null, limit: number, offset: number): AdminStripRow[] {
  return db
    .prepare(
      `SELECT id, session_id, share_code, is_public, print_count, created_at FROM strips
       WHERE ${DAY_FILTER} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    )
    .all(day, day, limit, offset) as unknown as AdminStripRow[]
}

export function stripsForDownload(db: Database, day: string | null): DownloadStripRow[] {
  return db
    .prepare(
      `SELECT share_code, image_path, date(created_at, 'localtime') AS day,
              strftime('%H-%M-%S', created_at, 'localtime') AS time
       FROM strips WHERE ${DAY_FILTER} ORDER BY created_at, id`,
    )
    .all(day, day) as unknown as DownloadStripRow[]
}

export function photosForDownload(db: Database, day: string | null): DownloadPhotoRow[] {
  return db
    .prepare(
      `SELECT strips.share_code, photos.shot_number, photos.image_path,
              date(strips.created_at, 'localtime') AS day,
              strftime('%H-%M-%S', strips.created_at, 'localtime') AS time
       FROM photos JOIN strips ON strips.session_id = photos.session_id
       WHERE ${DAY_FILTER} ORDER BY strips.created_at, strips.id, photos.shot_number`,
    )
    .all(day, day) as unknown as DownloadPhotoRow[]
}
