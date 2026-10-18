import { extname, join } from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import type { Database } from './db/connection.ts'
import { boothRouter } from './routes/booth.ts'
import { catalogRouter } from './routes/catalog.ts'
import { sharingRouter } from './routes/sharing.ts'
import { healthRouter } from './routes/health.ts'
import { FRAMES_URL } from './services/catalog.ts'
import { RequestError } from './services/request-error.ts'

export interface AppOptions {
  db: Database
  // The storage folder (photos/, strips/, frames/).
  storageDir: string
  // The address phones use to reach the booth, for share links. Read per request, since the
  // laptop's Wi-Fi address can change during an event.
  shareBaseUrl?: () => string
  // Built client to serve (client/dist). Omitted in tests and when Vite serves the client.
  clientDir?: string
}

export function createApp({ db, storageDir, clientDir, shareBaseUrl = () => 'http://localhost:3000' }: AppOptions): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', healthRouter(db))
  app.use('/api', catalogRouter(db))
  app.use('/api', boothRouter(db, storageDir))
  app.use('/api', sharingRouter(db, shareBaseUrl))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(FRAMES_URL, express.static(join(storageDir, 'frames'), { setHeaders: lockDownImage }))

  if (clientDir) {
    app.use(express.static(clientDir))
    // Single-page app: page routes fall back to index.html. A path with a file extension
    // that static did not find is a missing asset, so it gets a real 404.
    app.get('/{*path}', (req, res, next) => {
      if (extname(req.path)) return next()
      res.sendFile('index.html', { root: clientDir })
    })
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
  app.use(jsonErrors)
  return app
}

// Frames can be SVG, which a browser would run scripts in if opened directly. Images only.
function lockDownImage(res: express.Response): void {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  404: 'Not found',
  413: 'Request too large',
}

// Every error leaves as JSON with no stack trace: the server is reachable from any phone on
// the booth Wi-Fi, so internals stay in the laptop's log.
const jsonErrors: ErrorRequestHandler = (error, _req, res, next) => {
  // Too late for a JSON body; let Express close the connection.
  if (res.headersSent) return next(error)
  if (error instanceof RequestError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  const status = clientErrorStatus(error)
  if (status) {
    res.status(status).json({ error: CLIENT_ERROR_MESSAGES[status] ?? 'Bad request' })
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
