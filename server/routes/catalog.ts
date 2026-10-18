import { Router } from 'express'
import type { Database } from '../db/connection.ts'
import { boothSettings, filters, framesForLayout, layouts } from '../services/catalog.ts'
import { badRequest, positiveInteger } from './http.ts'

// What the booth screen needs to offer guests their choices.
export function catalogRouter(db: Database): Router {
  const router = Router()

  router.get('/layouts', (_req, res) => {
    res.json(layouts(db))
  })

  router.get('/frames', (req, res) => {
    const layoutId = positiveInteger(req.query.layoutId)
    if (layoutId === null) return badRequest(res, 'layoutId must be a whole number')
    res.json(framesForLayout(db, layoutId))
  })

  router.get('/filters', (_req, res) => {
    res.json(filters(db))
  })

  router.get('/booth-settings', (_req, res) => {
    res.json(boothSettings(db))
  })

  return router
}
