import { describe, expect, it } from 'vitest'
import { openDatabase } from '../db/connection.ts'
import { runMigrations } from '../db/migrate.ts'

const TABLES = [
  'admins',
  'layouts',
  'frames',
  'filters',
  'sessions',
  'photos',
  'strips',
  'print_jobs',
  'settings',
]

function names(db: ReturnType<typeof openDatabase>, type: 'table' | 'index'): string[] {
  const rows = db.prepare('SELECT name FROM sqlite_master WHERE type = ?').all(type)
  return rows.map((row) => String(row.name))
}

describe('runMigrations', () => {
  it('creates every table from the spec', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)
    expect(names(db, 'table')).toEqual(expect.arrayContaining(TABLES))
  })

  it('creates the three required indexes', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)
    expect(names(db, 'index')).toEqual(
      expect.arrayContaining(['idx_strips_share_code', 'idx_photos_session_id', 'idx_sessions_created_at']),
    )
  })

  it('is safe to run twice', () => {
    const db = openDatabase(':memory:')
    const first = runMigrations(db)
    const second = runMigrations(db)
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
  })

  it('seeds the layouts, the seven filters and the default settings', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)
    const shots = db.prepare('SELECT shots FROM layouts ORDER BY shots').all().map((r) => r.shots)
    expect(shots).toEqual([2, 3, 4])
    const filters = db.prepare('SELECT name, is_default FROM filters').all()
    expect(filters).toHaveLength(7)
    expect(filters.filter((f) => f.is_default === 1)).toEqual([{ name: 'Natural', is_default: 1 }])
    const gallery = db.prepare("SELECT value FROM settings WHERE key = 'gallery_enabled'").get()
    expect(gallery?.value).toBe('true')
    const autoDelete = db.prepare("SELECT value FROM settings WHERE key = 'auto_delete_days'").get()
    expect(autoDelete?.value).toBe('0')
  })

  it('enforces foreign keys', () => {
    const db = openDatabase(':memory:')
    runMigrations(db)
    const insertOrphan = () => db.prepare('INSERT INTO photos (session_id, shot_number, image_path) VALUES (999, 1, ?)').run('x.png')
    expect(insertOrphan).toThrow(/FOREIGN KEY/)
  })
})
