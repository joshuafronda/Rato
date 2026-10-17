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
  clientDir: join(ROOT, 'client', 'dist'),
}

export const databasePath = join(config.storageDir, 'stripshot.db')
export const storageFolders = ['photos', 'strips', 'frames'].map((name) => join(config.storageDir, name))

export function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') return DEFAULT_PORT
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number from 1 to 65535, got "${value}"`)
  }
  return port
}
