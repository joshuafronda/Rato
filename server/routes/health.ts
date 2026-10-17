import { Router } from 'express'
import type { Database } from '../db/connection.ts'
import { schemaVersion } from '../db/migrate.ts'

export function healthRouter(db: Database): Router {
  const router = Router()
  router.get('/health', (_req, res) => {
    res.json({ ok: true, database: 'ok', schemaVersion: schemaVersion(db) })
  })
  return router
}
