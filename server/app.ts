import express from 'express'
import type { Database } from './db/connection.ts'
import { healthRouter } from './routes/health.ts'

export interface AppOptions {
  db: Database
  // Built client to serve (client/dist). Omitted in tests and when Vite serves the client.
  clientDir?: string
}

export function createApp({ db, clientDir }: AppOptions): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', healthRouter(db))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  if (clientDir) {
    app.use(express.static(clientDir))
    // Single-page app: any other GET falls back to index.html.
    app.get('/{*path}', (_req, res) => {
      res.sendFile('index.html', { root: clientDir })
    })
  }
  return app
}
