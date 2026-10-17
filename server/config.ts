import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

// All runtime configuration in one place. Every value has a working offline default.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  // 0.0.0.0 so phones on the same Wi-Fi can reach the gallery and share links.
  host: process.env.HOST ?? '0.0.0.0',
  storageDir: process.env.STORAGE_DIR ?? join(ROOT, 'storage'),
  clientDir: join(ROOT, 'client', 'dist'),
}

export const databasePath = join(config.storageDir, 'stripshot.db')
export const storageFolders = ['photos', 'strips', 'frames'].map((name) => join(config.storageDir, name))
