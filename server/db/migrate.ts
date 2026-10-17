import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from './connection.ts'

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations')
const MIGRATION_FILE = /^(\d{3})_[a-z0-9_]+\.sql$/

// Applies every migration not yet recorded, each in its own transaction.
// Returns the versions applied by this call.
export function runMigrations(db: Database, dir: string = MIGRATIONS_DIR): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => Number(r.version)))
  const record = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)')
  const applied: number[] = []

  for (const file of readdirSync(dir).sort()) {
    const match = MIGRATION_FILE.exec(file)
    if (!match) continue
    const version = Number(match[1])
    if (done.has(version)) continue

    db.exec('BEGIN')
    try {
      db.exec(readFileSync(join(dir, file), 'utf8'))
      record.run(version)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${file} failed`, { cause: error })
    }
    applied.push(version)
  }
  return applied
}

export function schemaVersion(db: Database): number {
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()
  return Number(row?.version ?? 0)
}
