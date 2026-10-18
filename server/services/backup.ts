import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { snapshotDatabase } from '../db/admin-queries.ts'
import type { Database } from '../db/connection.ts'

const FOLDERS = ['photos', 'strips', 'frames']

// Copies everything into a new dated folder on the laptop: a consistent snapshot of the
// database plus the photos, strips and frames. Copy that folder to a USB drive to keep it.
export function createBackup(db: Database, storageDir: string, backupDir: string, now = new Date()): string {
  const target = join(backupDir, `rato-backup-${stamp(now)}`)
  if (existsSync(target)) throw new Error(`${target} already exists`)
  mkdirSync(target, { recursive: true })
  snapshotDatabase(db, join(target, 'rato.db'))
  for (const folder of FOLDERS) {
    const source = join(storageDir, folder)
    if (existsSync(source)) cpSync(source, join(target, folder), { recursive: true })
  }
  return target
}

function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}
