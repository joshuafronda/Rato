import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from './connection.ts'

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations')
const MIGRATION_FILE = /^(\d{3})_[a-z0-9_]+\.sql$/

interface Migration {
  version: number
  file: string
}

// Applies every migration not yet recorded, each in its own transaction.
// Returns the versions applied by this call.
export function runMigrations(db: Database, dir: string = MIGRATIONS_DIR): number[] {
  const migrations = listMigrations(dir)
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => Number(r.version)))
  const record = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)')
  const applied: number[] = []

  for (const { version, file } of migrations) {
    if (done.has(version)) continue
    db.exec('BEGIN')
    try {
      db.exec(readFileSync(join(dir, file), 'utf8'))
      // A file with its own COMMIT/ROLLBACK escapes the transaction, so its changes could not
      // be rolled back together with the version record. Refuse it.
      if (!db.isTransaction) throw new Error(`${file} must not BEGIN, COMMIT or ROLLBACK itself`)
      record.run(version)
      db.exec('COMMIT')
    } catch (error) {
      // The migration's own SQL may already have ended the transaction.
      if (db.isTransaction) db.exec('ROLLBACK')
      throw new Error(`Migration ${file} failed`, { cause: error })
    }
    applied.push(version)
  }
  return applied
}

// Every .sql file must be NNN_name.sql with a unique version, so a typo or a reused number
// stops startup instead of silently leaving the schema behind.
function listMigrations(dir: string): Migration[] {
  const migrations: Migration[] = []
  const seen = new Map<number, string>()
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    const match = MIGRATION_FILE.exec(file)
    if (!match) throw new Error(`Migration file ${file} must be named NNN_lowercase_name.sql`)
    const version = Number(match[1])
    const other = seen.get(version)
    if (other) throw new Error(`Migrations ${other} and ${file} share version ${version}`)
    seen.set(version, file)
    migrations.push({ version, file })
  }
  return migrations
}

export function schemaVersion(db: Database): number {
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()
  return Number(row?.version ?? 0)
}
