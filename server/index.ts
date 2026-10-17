import { existsSync, mkdirSync } from 'node:fs'
import { createApp } from './app.ts'
import { config, databasePath, storageFolders } from './config.ts'
import { openDatabase } from './db/connection.ts'
import { runMigrations } from './db/migrate.ts'

for (const folder of storageFolders) mkdirSync(folder, { recursive: true })

const db = openDatabase(databasePath)
const applied = runMigrations(db)
if (applied.length > 0) console.log(`Applied migrations: ${applied.join(', ')}`)

const clientDir = existsSync(config.clientDir) ? config.clientDir : undefined
if (!clientDir) console.log('client/dist not found - run "npm run build" or use the Vite dev server')

const app = createApp({ db, clientDir })
app.listen(config.port, config.host, (error) => {
  if (error) throw error
  console.log(`StripShot running at http://localhost:${config.port}`)
})
