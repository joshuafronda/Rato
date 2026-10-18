import express, { type RequestHandler, Router } from 'express'
import type { Database } from '../db/connection.ts'
import { RequestError } from '../services/request-error.ts'
import { createSession, findStrip, savePhotoFile, saveStripFile, stripImagePath } from '../services/strips.ts'
import { badRequest, positiveInteger } from './http.ts'

const IMAGE_TYPES = ['image/jpeg', 'image/png']
const photoBody = express.raw({ type: IMAGE_TYPES, limit: '15mb' })
const stripBody = express.raw({ type: IMAGE_TYPES, limit: '25mb' })

// The guest flow: start a session, upload the shots, upload the finished strip.
export function boothRouter(db: Database, storageDir: string, boothGuard: RequestHandler, onStripSaved: () => void): Router {
  const router = Router()

  router.post('/sessions', boothGuard, (req, res) => {
    const body: unknown = req.body
    const { layoutId, frameId, filterId } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
    if (!isId(layoutId)) return badRequest(res, 'Choose a layout')
    if (frameId !== null && !isId(frameId)) return badRequest(res, 'Choose a frame')
    if (!isId(filterId)) return badRequest(res, 'Choose a filter')
    res.status(201).json(createSession(db, { layoutId, frameId, filterId }))
  })

  router.post('/sessions/:id/photos/:shot', boothGuard, photoBody, (req, res) => {
    const sessionId = positiveInteger(req.params.id)
    if (sessionId === null) return badRequest(res, 'Session not found', 404)
    // 0 and junk become out-of-range shots, which the service explains with the shot count.
    const shot = positiveInteger(req.params.shot) ?? 0
    savePhotoFile(db, storageDir, sessionId, shot, imageBody(req.body, 'Send a JPEG or PNG image'))
    res.status(201).json({ ok: true })
  })

  router.post('/sessions/:id/strip', boothGuard, stripBody, (req, res) => {
    const sessionId = positiveInteger(req.params.id)
    if (sessionId === null) return badRequest(res, 'Session not found', 404)
    const strip = saveStripFile(db, storageDir, sessionId, imageBody(req.body, 'Send the strip as a PNG image'))
    onStripSaved()
    res.status(201).json(strip)
  })

  router.get('/strips/:code', (req, res) => {
    const strip = findStrip(db, req.params.code)
    if (!strip) return badRequest(res, 'Strip not found', 404)
    res.json(strip)
  })

  router.get('/strips/:code/image', (req, res) => {
    const path = stripImagePath(db, storageDir, req.params.code)
    if (!path) return badRequest(res, 'Strip not found', 404)
    res.sendFile(path, { headers: { 'X-Content-Type-Options': 'nosniff' } })
  })

  return router
}

// Booth writes: sessions, photos, strips, printing and sharing. By default only the laptop
// itself, so phones on the Wi-Fi can view strips but not make them. With the BOOTH_ANY_DEVICE
// option, any device on the Wi-Fi (an iPad over https) can be a booth too.
export function boothOnly(anyDevice: boolean): RequestHandler {
  if (anyDevice) return (_req, _res, next) => next()
  return localOnly('Only the booth screen can do this')
}

// Lets a request through only from the laptop itself (http://localhost).
export function localOnly(message: string): RequestHandler {
  return (req, res, next) => {
    if (isLoopback(req.socket.remoteAddress)) return next()
    badRequest(res, message, 403)
  }
}

export function isLoopback(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

// express.raw leaves req.body unset when the Content-Type is not an image type.
function imageBody(body: unknown, message: string): Buffer {
  if (!Buffer.isBuffer(body) || body.length === 0) throw new RequestError(415, message)
  return body
}
