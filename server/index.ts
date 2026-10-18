import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app.ts'
import { config, databasePath, storageFolders } from './config.ts'
import { openDatabase } from './db/connection.ts'
import { runMigrations } from './db/migrate.ts'
import { installStarterFrames } from './services/catalog.ts'
import { deleteExpiredSessions } from './services/cleanup.ts'
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

const clientDir = existsSync(config.clientDir) ? config.clientDir : undefined
if (!clientDir) console.log('client/dist not found - run "npm run build" or use the Vite dev server')

const app = createApp({
  db,
  storageDir: config.storageDir,
  backupDir: config.backupDir,
  clientDir,
  shareBaseUrl: () => shareBaseUrl(config.port, config.publicHost),
})
app.listen(config.port, config.host, (error) => {
  if (error) throw error
  const shown = config.host === '0.0.0.0' ? 'localhost' : config.host
  console.log(`Rato running at http://${shown}:${config.port}`)
  console.log(`Phones on the same Wi-Fi: ${shareBaseUrl(config.port, config.publicHost)}/gallery`)
})
