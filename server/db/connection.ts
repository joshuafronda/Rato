import { DatabaseSync } from 'node:sqlite'

export type Database = DatabaseSync

// One place that opens SQLite, so every caller gets the same pragmas.
export function openDatabase(path: string): Database {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  return db
}
