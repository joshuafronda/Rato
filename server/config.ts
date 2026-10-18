import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DEFAULT_PORT = 3000

// All runtime configuration in one place. Every value has a working offline default.
export const config = {
  port: parsePort(process.env.PORT),
  // 0.0.0.0 so phones on the same Wi-Fi can reach the gallery and share links.
  host: process.env.HOST || '0.0.0.0',
  // Relative paths resolve from the repo root, not from whichever folder npm started in.
  storageDir: resolve(ROOT, process.env.STORAGE_DIR || 'storage'),
  backupDir: resolve(ROOT, process.env.BACKUP_DIR || 'backups'),
  clientDir: join(ROOT, 'client', 'dist'),
  // The laptop's address for share links and QR codes. Empty = detect the Wi-Fi address.
  publicHost: process.env.PUBLIC_HOST || '',
  // The online gallery (Firebase Storage). Off unless both are set: the bucket name and the
  // path to the service account key file, which lives outside the repo.
  firebaseBucket: process.env.FIREBASE_BUCKET || '',
  firebaseKeyFile: process.env.FIREBASE_KEY_FILE || '',
}

export const databasePath = join(config.storageDir, 'rato.db')
export const storageFolders = ['photos', 'strips', 'frames'].map((name) => join(config.storageDir, name))

export function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') return DEFAULT_PORT
  // Digits only: Number() would also accept '0x0BB8', '3e3' and ' 3000 '.
  const port = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number from 1 to 65535, got "${value}"`)
  }
  return port
}
