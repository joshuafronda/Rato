import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app.ts'
import { config, databasePath, storageFolders } from './config.ts'
import { openDatabase } from './db/connection.ts'
import { runMigrations } from './db/migrate.ts'
import { installStarterFrames } from './services/catalog.ts'
import { deleteExpiredSessions } from './services/cleanup.ts'
import { type CloudBucket, cloudGallerySync, coalescedRunner } from './services/cloud-gallery.ts'
import { firebaseBucket } from './services/firebase-bucket.ts'
import { shareBaseUrl } from './services/network.ts'

for (const folder of storageFolders) mkdirSync(folder, { recursive: true })
installStarterFrames(join(config.storageDir, 'frames'))

const db = openDatabase(databasePath)
const applied = runMigrations(db)
if (applied.length > 0) console.log(`Applied migrations: ${applied.join(', ')}`)

// The admin's auto-delete setting, checked at startup and every hour.
const AUTO_DELETE_CHECK_MS = 3_600_000
const autoDelete = () => {
  const removed = deleteExpiredSessions(db, config.storageDir)
  if (removed > 0) console.log(`Auto-delete removed ${removed} old session(s)`)
}
autoDelete()
setInterval(autoDelete, AUTO_DELETE_CHECK_MS).unref()

// The online gallery, when configured. Retries every half minute, so strips shared while the
// internet is down go up once it is back. A saved strip also starts a sync straight away, so
// it shows online within seconds. The booth never waits on it.
const CLOUD_SYNC_MS = 30_000
const bucket = connectBucket()
let syncNow = () => {}
if (bucket) {
  const sync = cloudGallerySync(db, config.storageDir, bucket)
  let lastError = ''
  const cloudSync = coalescedRunner(async () => {
    try {
      const { uploaded, removed } = await sync()
      if (uploaded > 0 || removed > 0) console.log(`Online gallery: ${uploaded} uploaded, ${removed} removed`)
      lastError = ''
    } catch (error) {
      // Logged once per new error, not every 30 seconds while offline.
      const message = errorMessage(error)
      if (message !== lastError) console.log(`Online gallery sync failed, will retry: ${message}`)
      lastError = message
    }
  })
  syncNow = () => void cloudSync()
  syncNow()
  setInterval(syncNow, CLOUD_SYNC_MS).unref()
}

// A bad key file leaves the online gallery off; the booth itself still starts.
function connectBucket(): CloudBucket | undefined {
  if (!config.firebaseBucket || !config.firebaseKeyFile) {
    console.log('Online gallery off - set FIREBASE_BUCKET and FIREBASE_KEY_FILE to turn it on')
    return undefined
  }
  try {
    return firebaseBucket(config.firebaseBucket, config.firebaseKeyFile)
  } catch (error) {
    console.log(`Online gallery off - could not load the Firebase key: ${errorMessage(error)}`)
    return undefined
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const clientDir = existsSync(config.clientDir) ? config.clientDir : undefined
if (!clientDir) console.log('client/dist not found - run "npm run build" or use the Vite dev server')

const app = createApp({
  db,
  storageDir: config.storageDir,
  backupDir: config.backupDir,
  clientDir,
  shareBaseUrl: () => shareBaseUrl(config.port, config.publicHost),
  onlineGallery: bucket !== undefined,
  onStripSaved: () => syncNow(),
})
app.listen(config.port, config.host, (error) => {
  if (error) throw error
  const shown = config.host === '0.0.0.0' ? 'localhost' : config.host
  console.log(`Rato running at http://${shown}:${config.port}`)
  console.log(`Phones on the same Wi-Fi: ${shareBaseUrl(config.port, config.publicHost)}/gallery`)
})
