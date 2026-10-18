import { Router } from 'express'
import type { Database } from '../db/connection.ts'
import { claimPrintJob, finishPrint, queuePrint } from '../services/printing.ts'
import { gallery, setVisibility, shareLink } from '../services/sharing.ts'
import { boothOnly } from './booth.ts'
import { badRequest, positiveInteger } from './http.ts'

const GALLERY_LIMIT = 60

// Printing, share links and the public gallery.
export function sharingRouter(db: Database, shareBaseUrl: () => string, onlineGallery: boolean): Router {
  const router = Router()

  router.get('/gallery', (req, res) => {
    const limit = Math.min(positiveInteger(req.query.limit) ?? GALLERY_LIMIT, GALLERY_LIMIT)
    res.json(gallery(db, limit))
  })

  router.get('/strips/:code/share', async (req, res) => {
    res.json(await shareLink(db, shareBaseUrl(), req.params.code, onlineGallery))
  })

  router.post('/strips/:code/visibility', boothOnly, (req, res) => {
    const isPublic: unknown = req.body?.isPublic
    if (typeof isPublic !== 'boolean') return badRequest(res, 'isPublic must be true or false')
    setVisibility(db, String(req.params.code), isPublic)
    res.json({ isPublic })
  })

  router.post('/strips/:code/prints', boothOnly, (req, res) => {
    const copies: unknown = req.body?.copies
    res.status(201).json({ id: queuePrint(db, String(req.params.code), typeof copies === 'number' ? copies : 0) })
  })

  router.post('/print-queue/claim', boothOnly, (_req, res) => {
    res.json({ job: claimPrintJob(db) })
  })

  router.post('/print-queue/:id/finish', boothOnly, (req, res) => {
    const id = positiveInteger(req.params.id)
    const printed: unknown = req.body?.printed
    if (id === null || typeof printed !== 'boolean') return badRequest(res, 'Send the job id and printed: true or false')
    finishPrint(db, id, printed)
    res.json({ ok: true })
  })

  return router
}
