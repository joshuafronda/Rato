import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { deleteSession, sessionFiles, sessionsOlderThan } from '../db/admin-queries.ts'
import { readSettings } from '../db/catalog-queries.ts'
import type { Database } from '../db/connection.ts'

// Removes a guest completely: the session row (which cascades to its photos, strip and
// print jobs) and every file it left in storage.
export function removeSession(db: Database, storageDir: string, sessionId: number): void {
  const files = sessionFiles(db, sessionId)
  deleteSession(db, sessionId)
  for (const photo of files.photos) rmSync(join(storageDir, 'photos', photo), { force: true })
  if (files.strip) rmSync(join(storageDir, 'strips', files.strip), { force: true })
}

// The admin's auto-delete setting: sessions older than that many days go. 0 = off.
// Returns how many sessions were removed.
export function deleteExpiredSessions(db: Database, storageDir: string): number {
  const days = Number(readSettings(db, ['auto_delete_days']).get('auto_delete_days'))
  if (!Number.isInteger(days) || days <= 0) return 0
  const expired = sessionsOlderThan(db, days)
  for (const id of expired) removeSession(db, storageDir, id)
  return expired.length
}
