import type { Database } from './connection.ts'

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
