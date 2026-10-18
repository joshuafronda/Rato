import { type Database, inTransaction } from './connection.ts'

export interface SessionRow {
  id: number
  shots: number
  has_strip: number
}

export interface StripRow {
  share_code: string
  image_path: string
  created_at: string
}

export function insertSession(db: Database, layoutId: number, frameId: number | null, filterId: number): number {
  const result = db
    .prepare('INSERT INTO sessions (layout_id, frame_id, filter_id) VALUES (?, ?, ?)')
    .run(layoutId, frameId, filterId)
  return Number(result.lastInsertRowid)
}

export function findSession(db: Database, id: number): SessionRow | undefined {
  return db
    .prepare(
      `SELECT sessions.id, layouts.shots, EXISTS (SELECT 1 FROM strips WHERE session_id = sessions.id) AS has_strip
       FROM sessions JOIN layouts ON layouts.id = sessions.layout_id WHERE sessions.id = ?`,
    )
    .get(id) as unknown as SessionRow | undefined
}

export function findPhotoPath(db: Database, sessionId: number, shot: number): string | undefined {
  const row = db.prepare('SELECT image_path FROM photos WHERE session_id = ? AND shot_number = ?').get(sessionId, shot)
  return row ? String(row.image_path) : undefined
}

export function savePhoto(db: Database, sessionId: number, shot: number, imagePath: string): void {
  db.prepare(
    `INSERT INTO photos (session_id, shot_number, image_path) VALUES (?, ?, ?)
     ON CONFLICT (session_id, shot_number) DO UPDATE SET image_path = excluded.image_path`,
  ).run(sessionId, shot, imagePath)
}

export function countPhotos(db: Database, sessionId: number): number {
  return Number(db.prepare('SELECT COUNT(*) AS n FROM photos WHERE session_id = ?').get(sessionId)?.n)
}

export function insertStrip(db: Database, sessionId: number, imagePath: string, shareCode: string): void {
  db.prepare('INSERT INTO strips (session_id, image_path, share_code) VALUES (?, ?, ?)').run(sessionId, imagePath, shareCode)
}

export function findStripByCode(db: Database, shareCode: string): StripRow | undefined {
  return db
    .prepare('SELECT share_code, image_path, created_at FROM strips WHERE share_code = ?')
    .get(shareCode) as unknown as StripRow | undefined
}

export interface PublicStripRow {
  share_code: string
  created_at: string
}

export interface ClaimedPrintRow {
  id: number
  copies: number
  share_code: string
}

export function findStripId(db: Database, shareCode: string): number | undefined {
  const row = db.prepare('SELECT id FROM strips WHERE share_code = ?').get(shareCode)
  return row ? Number(row.id) : undefined
}

export function findStripVisibility(db: Database, shareCode: string): boolean | undefined {
  const row = db.prepare('SELECT is_public FROM strips WHERE share_code = ?').get(shareCode)
  return row ? row.is_public === 1 : undefined
}

export function setStripPublic(db: Database, shareCode: string, isPublic: boolean): boolean {
  const result = db.prepare('UPDATE strips SET is_public = ? WHERE share_code = ?').run(isPublic ? 1 : 0, shareCode)
  return Number(result.changes) > 0
}

export function listPublicStrips(db: Database, limit: number): PublicStripRow[] {
  return db
    .prepare('SELECT share_code, created_at FROM strips WHERE is_public = 1 ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(limit) as unknown as PublicStripRow[]
}

// Every shared strip, for the online gallery.
export function listAllPublicStrips(db: Database): (PublicStripRow & { image_path: string })[] {
  return db
    .prepare('SELECT share_code, image_path, created_at FROM strips WHERE is_public = 1 ORDER BY created_at DESC, id DESC')
    .all() as unknown as (PublicStripRow & { image_path: string })[]
}

export function insertPrintJob(db: Database, stripId: number, copies: number): number {
  const result = db.prepare('INSERT INTO print_jobs (strip_id, copies) VALUES (?, ?)').run(stripId, copies)
  return Number(result.lastInsertRowid)
}

// Takes the oldest queued job and marks it printing in one statement, so no two callers
// get the same job.
export function claimNextPrintJob(db: Database): ClaimedPrintRow | undefined {
  return db
    .prepare(
      `UPDATE print_jobs SET status = 'printing'
       WHERE id = (SELECT id FROM print_jobs WHERE status = 'queued' ORDER BY id LIMIT 1)
       RETURNING id, copies, (SELECT share_code FROM strips WHERE strips.id = print_jobs.strip_id) AS share_code`,
    )
    .get() as unknown as ClaimedPrintRow | undefined
}

// Ends a job that is printing. A printed job adds its copies to the strip's print count.
export function finishPrintJob(db: Database, id: number, printed: boolean): boolean {
  return inTransaction(db, () => {
    const result = db
      .prepare("UPDATE print_jobs SET status = ? WHERE id = ? AND status = 'printing'")
      .run(printed ? 'printed' : 'failed', id)
    const changed = Number(result.changes) > 0
    if (changed && printed) {
      db.prepare(
        'UPDATE strips SET print_count = print_count + (SELECT copies FROM print_jobs WHERE id = ?) WHERE id = (SELECT strip_id FROM print_jobs WHERE id = ?)',
      ).run(id, id)
    }
    return changed
  })
}
