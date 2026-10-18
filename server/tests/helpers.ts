import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'vitest'
import { type Database, openDatabase } from '../db/connection.ts'
import { runMigrations } from '../db/migrate.ts'

const opened: Database[] = []
const tempDirs: string[] = []

afterEach(() => {
  for (const db of opened.splice(0)) if (db.isOpen) db.close()
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

// A fresh, fully migrated in-memory database, closed after the test.
export function migratedDb(): Database {
  const db = openDatabase(':memory:')
  opened.push(db)
  runMigrations(db)
  return db
}

// A temporary folder, removed after the test.
export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}
