import express, { type Request, type RequestHandler, Router } from 'express'
import type { Database } from '../db/connection.ts'
import {
  adminFilters,
  adminFrames,
  adminLayouts,
  adminStrips,
  changeFilter,
  changeFrame,
  changeLayout,
  changeStripVisibility,
  deleteStrip,
  makeDefaultFilter,
  overview,
  printJobs,
  reorderFrames,
  reprint,
  uploadFrame,
} from '../services/admin.ts'
import {
  type Admin,
  LoginLimiter,
  SESSION_MAX_AGE_MS,
  adminForToken,
  createFirstAdmin,
  logIn,
  logOut,
  setupNeeded,
} from '../services/admin-auth.ts'
import { createBackup } from '../services/backup.ts'
import { RequestError } from '../services/request-error.ts'
import { readSettingsForAdmin, updateSettings } from '../services/settings.ts'
import { boothOnly } from './booth.ts'
import { badRequest, positiveInteger } from './http.ts'

const COOKIE = 'rato_admin'
const frameBody = express.raw({ type: 'image/png', limit: '10mb' })

export interface AdminRouterOptions {
  db: Database
  storageDir: string
  backupDir: string
}

// The admin dashboard API. Everything except status, setup and login needs a signed-in admin.
export function adminRouter({ db, storageDir, backupDir }: AdminRouterOptions): Router {
  const router = Router()
  const limiter = new LoginLimiter()
  router.use(sameSiteWrites)

  router.get('/status', (req, res) => {
    const admin = adminForToken(db, sessionToken(req))
    res.json({ setupNeeded: setupNeeded(db), username: admin?.username ?? null })
  })

  // The first admin can only be created on the booth laptop itself.
  router.post('/setup', boothOnly, (req, res) => {
    const { username, password } = credentials(req.body)
    setSessionCookie(res, createFirstAdmin(db, username, password))
    res.status(201).json({ ok: true })
  })

  router.post('/login', (req, res) => {
    const { username, password } = credentials(req.body)
    setSessionCookie(res, logIn(db, limiter, req.socket.remoteAddress ?? '', username, password))
    res.json({ ok: true })
  })

  router.post('/logout', (req, res) => {
    const token = sessionToken(req)
    if (token) logOut(db, token)
    res.clearCookie(COOKIE, { path: '/', httpOnly: true, sameSite: 'strict' })
    res.json({ ok: true })
  })

  router.use(requireAdmin(db))

  router.get('/overview', (_req, res) => {
    res.json(overview(db))
  })

  router.get('/layouts', (_req, res) => {
    res.json(adminLayouts(db))
  })

  router.patch('/layouts/:id', (req, res) => {
    changeLayout(db, idParam(req), booleanField(req.body, 'active'))
    res.json({ ok: true })
  })

  router.get('/frames', (_req, res) => {
    res.json(adminFrames(db))
  })

  router.post('/frames', frameBody, (req, res) => {
    const layoutId = positiveInteger(req.query.layoutId)
    if (layoutId === null) return badRequest(res, 'Choose a layout for the frame')
    const name = typeof req.query.name === 'string' ? req.query.name : ''
    if (!Buffer.isBuffer(req.body)) throw new RequestError(415, 'Upload the frame as a PNG image')
    res.status(201).json({ id: uploadFrame(db, storageDir, layoutId, name, req.body) })
  })

  router.patch('/frames/:id', (req, res) => {
    const body = objectBody(req.body)
    const changes: { name?: string; active?: boolean } = {}
    if ('name' in body) changes.name = stringField(body, 'name')
    if ('active' in body) changes.active = booleanField(body, 'active')
    changeFrame(db, idParam(req), changes)
    res.json({ ok: true })
  })

  router.post('/frames/reorder', (req, res) => {
    const body = objectBody(req.body)
    const layoutId = body.layoutId
    const ids = body.ids
    if (typeof layoutId !== 'number' || !Array.isArray(ids) || !ids.every((id) => typeof id === 'number')) {
      return badRequest(res, 'Send layoutId and the frame ids in order')
    }
    reorderFrames(db, layoutId, ids)
    res.json({ ok: true })
  })

  router.get('/filters', (_req, res) => {
    res.json(adminFilters(db))
  })

  router.patch('/filters/:id', (req, res) => {
    changeFilter(db, idParam(req), booleanField(req.body, 'active'))
    res.json({ ok: true })
  })

  router.post('/filters/:id/default', (req, res) => {
    makeDefaultFilter(db, idParam(req))
    res.json({ ok: true })
  })

  router.get('/strips', (req, res) => {
    const page = typeof req.query.page === 'string' && /^\d+$/.test(req.query.page) ? Number(req.query.page) : 0
    res.json(adminStrips(db, page))
  })

  router.patch('/strips/:id', (req, res) => {
    changeStripVisibility(db, idParam(req), booleanField(req.body, 'isPublic'))
    res.json({ ok: true })
  })

  router.delete('/strips/:id', (req, res) => {
    deleteStrip(db, storageDir, idParam(req))
    res.json({ ok: true })
  })

  router.get('/print-jobs', (_req, res) => {
    res.json(printJobs(db))
  })

  router.post('/print-jobs/:id/reprint', (req, res) => {
    res.status(201).json({ id: reprint(db, idParam(req)) })
  })

  router.get('/settings', (_req, res) => {
    res.json(readSettingsForAdmin(db))
  })

  router.put('/settings', (req, res) => {
    res.json(updateSettings(db, objectBody(req.body)))
  })

  router.post('/backup', (_req, res) => {
    res.status(201).json({ path: createBackup(db, storageDir, backupDir) })
  })

  return router
}

function requireAdmin(db: Database): RequestHandler {
  return (req, res, next) => {
    const admin: Admin | undefined = adminForToken(db, sessionToken(req))
    if (!admin) return badRequest(res, 'Sign in first', 401)
    next()
  }
}

// The session cookie is SameSite=Strict, so another site cannot send it. As a second guard,
// a change with a body must be JSON or a PNG: an HTML form on another site can send
// neither without the browser asking first.
const sameSiteWrites: RequestHandler = (req, res, next) => {
  const safe = req.method === 'GET' || req.method === 'HEAD'
  if (safe || !req.headers['content-type'] || req.is(['application/json', 'image/png'])) return next()
  badRequest(res, 'Send JSON', 415)
}

function setSessionCookie(res: express.Response, token: string): void {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: SESSION_MAX_AGE_MS })
}

function sessionToken(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE) return value.join('=')
  }
  return undefined
}

function idParam(req: Request): number {
  const id = positiveInteger(req.params.id)
  if (id === null) throw new RequestError(404, 'Not found')
  return id
}

function objectBody(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}

function booleanField(body: unknown, name: string): boolean {
  const value = objectBody(body)[name]
  if (typeof value !== 'boolean') throw new RequestError(400, `${name} must be true or false`)
  return value
}

function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name]
  if (typeof value !== 'string') throw new RequestError(400, `${name} must be text`)
  return value
}

function credentials(body: unknown): { username: string; password: string } {
  const { username, password } = objectBody(body)
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new RequestError(400, 'Enter a username and a password')
  }
  return { username, password }
}
