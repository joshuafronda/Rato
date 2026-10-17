import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from '../db/connection.ts'
import { runMigrations, schemaVersion } from '../db/migrate.ts'

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

const opened: Database[] = []
const tempDirs: string[] = []

function memoryDb(): Database {
  const db = openDatabase(':memory:')
  opened.push(db)
  return db
}

function tempDir(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'stripshot-migrate-'))
  tempDirs.push(dir)
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql)
  return dir
}

afterEach(() => {
  for (const db of opened.splice(0)) if (db.isOpen) db.close()
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function names(db: Database, type: 'table' | 'index'): string[] {
  const rows = db.prepare('SELECT name FROM sqlite_master WHERE type = ?').all(type)
  return rows.map((row) => String(row.name))
}

describe('runMigrations', () => {
  it('creates every table from the spec', () => {
    const db = memoryDb()
    runMigrations(db)
    expect(names(db, 'table')).toEqual(expect.arrayContaining(TABLES))
  })

  it('creates the three required indexes', () => {
    const db = memoryDb()
    runMigrations(db)
    expect(names(db, 'index')).toEqual(
      expect.arrayContaining(['idx_strips_share_code', 'idx_photos_session_id', 'idx_sessions_created_at']),
    )
  })

  it('is safe to run twice', () => {
    const db = memoryDb()
    const first = runMigrations(db)
    const second = runMigrations(db)
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
    expect(schemaVersion(db)).toBe(first[first.length - 1])
  })

  it('seeds the layouts, the seven filters and the default settings', () => {
    const db = memoryDb()
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
    const db = memoryDb()
    runMigrations(db)
    const insertOrphan = () => db.prepare('INSERT INTO photos (session_id, shot_number, image_path) VALUES (999, 1, ?)').run('x.png')
    expect(insertOrphan).toThrow(/FOREIGN KEY/)
  })

  it('refuses a short share code and a second admin that differs only in case', () => {
    const db = memoryDb()
    runMigrations(db)
    db.prepare('INSERT INTO sessions (layout_id) VALUES (1)').run()
    const insertStrip = db.prepare('INSERT INTO strips (session_id, image_path, share_code) VALUES (1, ?, ?)')
    expect(() => insertStrip.run('s.png', 'abc')).toThrow(/CHECK/)
    expect(() => insertStrip.run('s.png', 'abcd1234')).not.toThrow()

    const insertAdmin = db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, 'hash')")
    insertAdmin.run('admin')
    expect(() => insertAdmin.run('Admin')).toThrow(/UNIQUE/)
  })

  it('rolls back a failing migration and records nothing for it', () => {
    const dir = tempDir({
      '001_good.sql': 'CREATE TABLE kept (id INTEGER);',
      '002_bad.sql': 'CREATE TABLE half_done (id INTEGER); INSERT INTO missing_table VALUES (1);',
    })
    const db = memoryDb()
    expect(() => runMigrations(db, dir)).toThrow(/Migration 002_bad\.sql failed/)
    expect(names(db, 'table')).toContain('kept')
    expect(names(db, 'table')).not.toContain('half_done')
    expect(schemaVersion(db)).toBe(1)
    expect(db.isTransaction).toBe(false)
  })

  it('refuses a .sql file whose name does not follow NNN_name.sql', () => {
    const dir = tempDir({ '001_good.sql': 'SELECT 1;', '2_typo.sql': 'SELECT 1;' })
    expect(() => runMigrations(memoryDb(), dir)).toThrow(/2_typo\.sql/)
  })

  it('refuses two migrations with the same version', () => {
    const dir = tempDir({ '001_one.sql': 'SELECT 1;', '001_two.sql': 'SELECT 1;' })
    expect(() => runMigrations(memoryDb(), dir)).toThrow(/version 1/)
  })

  it('turns on WAL and foreign keys for a database file', () => {
    const db = openDatabase(join(tempDir(), 'booth.db'))
    opened.push(db)
    expect(db.prepare('PRAGMA journal_mode').get()?.journal_mode).toBe('wal')
    expect(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1)
  })
})
