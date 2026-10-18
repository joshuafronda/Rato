import type { Database } from './connection.ts'

export interface LayoutRow {
  id: number
  name: string
  shots: number
  orientation: string
}

export interface FrameRow {
  id: number
  layout_id: number
  name: string
  image_path: string
}

export interface FilterRow {
  id: number
  name: string
  params: string
  is_default: number
}

export function listActiveLayouts(db: Database): LayoutRow[] {
  return db
    .prepare('SELECT id, name, shots, orientation FROM layouts WHERE active = 1 ORDER BY shots, id')
    .all() as unknown as LayoutRow[]
}

export function findActiveLayout(db: Database, id: number): LayoutRow | undefined {
  return db
    .prepare('SELECT id, name, shots, orientation FROM layouts WHERE id = ? AND active = 1')
    .get(id) as unknown as LayoutRow | undefined
}

export function listActiveFrames(db: Database, layoutId: number): FrameRow[] {
  return db
    .prepare(
      `SELECT id, layout_id, name, image_path FROM frames
       WHERE layout_id = ? AND active = 1 ORDER BY sort_order, id`,
    )
    .all(layoutId) as unknown as FrameRow[]
}

export function findActiveFrame(db: Database, id: number): FrameRow | undefined {
  return db
    .prepare('SELECT id, layout_id, name, image_path FROM frames WHERE id = ? AND active = 1')
    .get(id) as unknown as FrameRow | undefined
}

export function listActiveFilters(db: Database): FilterRow[] {
  return db
    .prepare('SELECT id, name, params, is_default FROM filters WHERE active = 1 ORDER BY id')
    .all() as unknown as FilterRow[]
}

export function findActiveFilter(db: Database, id: number): FilterRow | undefined {
  return db
    .prepare('SELECT id, name, params, is_default FROM filters WHERE id = ? AND active = 1')
    .get(id) as unknown as FilterRow | undefined
}

export function readSettings(db: Database, keys: readonly string[]): Map<string, string> {
  const placeholders = keys.map(() => '?').join(', ')
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys)
  return new Map(rows.map((row) => [String(row.key), String(row.value)]))
}
