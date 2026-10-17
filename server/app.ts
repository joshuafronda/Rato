import { extname } from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
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
    // Single-page app: page routes fall back to index.html. A path with a file extension
    // that static did not find is a missing asset, so it gets a real 404.
    app.get('/{*path}', (req, res, next) => {
      if (extname(req.path)) return next()
      res.sendFile('index.html', { root: clientDir })
    })
  }

  app.use(jsonErrors)
  return app
}

// Every error leaves as JSON with no stack trace: the server is reachable from any phone on
// the booth Wi-Fi, so internals stay in the laptop's log.
const jsonErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = clientErrorStatus(error)
  if (status) {
    res.status(status).json({ error: 'Bad request' })
    return
  }
  console.error(error)
  res.status(500).json({ error: 'Something went wrong' })
}

// body-parser and other http-errors set a 4xx status for problems with the request itself.
function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null
  const status = Number(error.status)
  return status >= 400 && status < 500 ? status : null
}
