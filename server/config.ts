import { hostname } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DEFAULT_PORT = 3000
const DEFAULT_HTTPS_PORT = 3443

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
  // This booth's folder in the online gallery, so several booths can share one bucket.
  boothId: boothIdFrom(process.env.BOOTH_ID, hostname()),
  // Lets other devices on the Wi-Fi (an iPad) run the booth too, not only the laptop itself.
  boothAnyDevice: boothAnyDeviceFrom(process.env.BOOTH_ANY_DEVICE),
  // The https address other devices use, so their browsers allow the camera.
  httpsPort: parsePort(process.env.HTTPS_PORT, 'HTTPS_PORT', DEFAULT_HTTPS_PORT),
}

export const databasePath = join(config.storageDir, 'rato.db')
export const storageFolders = ['photos', 'strips', 'frames'].map((name) => join(config.storageDir, name))

export function parsePort(value: string | undefined, name = 'PORT', fallback = DEFAULT_PORT): number {
  if (value === undefined || value === '') return fallback
  // Digits only: Number() would also accept '0x0BB8', '3e3' and ' 3000 '.
  const port = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a whole number from 1 to 65535, got "${value}"`)
  }
  return port
}

// BOOTH_ID, else the computer name, made safe for a folder name: lowercase letters, digits and
// dashes, at most 32 characters.
export function boothIdFrom(value: string | undefined, computerName: string): string {
  const raw = value || computerName
  const safe = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32).replace(/^-+|-+$/g, '')
  return safe || 'booth'
}

export function boothAnyDeviceFrom(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true'
}
