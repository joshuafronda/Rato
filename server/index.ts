import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app.ts'
import { config, databasePath, storageFolders } from './config.ts'
import { openDatabase } from './db/connection.ts'
import { runMigrations } from './db/migrate.ts'
import { installStarterFrames } from './services/catalog.ts'

for (const folder of storageFolders) mkdirSync(folder, { recursive: true })
installStarterFrames(join(config.storageDir, 'frames'))

const db = openDatabase(databasePath)
const applied = runMigrations(db)
if (applied.length > 0) console.log(`Applied migrations: ${applied.join(', ')}`)

const clientDir = existsSync(config.clientDir) ? config.clientDir : undefined
if (!clientDir) console.log('client/dist not found - run "npm run build" or use the Vite dev server')

const app = createApp({ db, storageDir: config.storageDir, clientDir })
app.listen(config.port, config.host, (error) => {
  if (error) throw error
  const shown = config.host === '0.0.0.0' ? 'localhost' : config.host
  console.log(`Rato running at http://${shown}:${config.port}`)
})
