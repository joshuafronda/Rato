import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { installStarterFrames } from '../services/catalog.ts'
import { migratedDb, tempDir } from './helpers.ts'

function app(db = migratedDb()) {
  return createApp({ db, storageDir: tempDir('rato-storage-') })
}

describe('GET /api/layouts', () => {
  it('lists only active layouts, fewest shots first', async () => {
    const db = migratedDb()
    db.prepare("UPDATE layouts SET active = 0 WHERE name = 'Triple strip'").run()
    const res = await request(app(db)).get('/api/layouts')
    expect(res.status).toBe(200)
    expect(res.body.map((layout: { shots: number }) => layout.shots)).toEqual([2, 4])
    expect(res.body[0]).toEqual({ id: expect.any(Number), name: 'Classic duo', shots: 2, orientation: 'vertical' })
  })
})

describe('GET /api/frames', () => {
  it('lists the active frames of one layout in sort order, with an image URL', async () => {
    const db = migratedDb()
    const layout = db.prepare("SELECT id FROM layouts WHERE shots = 4").get()
    const res = await request(app(db)).get(`/api/frames?layoutId=${layout?.id}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    for (const frame of res.body) {
      expect(frame).toEqual({ id: expect.any(Number), layoutId: layout?.id, name: expect.any(String), imageUrl: expect.stringMatching(/^\/frames\/[a-z0-9-]+\.svg$/) })
    }
  })

  it('leaves out disabled frames', async () => {
    const db = migratedDb()
    const layout = db.prepare("SELECT id FROM layouts WHERE shots = 2").get()
    db.prepare('UPDATE frames SET active = 0 WHERE layout_id = ?').run(Number(layout?.id))
    const res = await request(app(db)).get(`/api/frames?layoutId=${layout?.id}`)
    expect(res.body).toEqual([])
  })

  it('rejects a missing or malformed layoutId', async () => {
    for (const query of ['', '?layoutId=abc', '?layoutId=1.5', '?layoutId=-1']) {
      const res = await request(app()).get(`/api/frames${query}`)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'layoutId must be a whole number' })
    }
  })
})

describe('GET /api/filters', () => {
  it('lists active filters with parsed params and the default flag', async () => {
    const db = migratedDb()
    db.prepare("UPDATE filters SET active = 0 WHERE name = 'Pastel'").run()
    const res = await request(app(db)).get('/api/filters')
    expect(res.status).toBe(200)
    const names = res.body.map((filter: { name: string }) => filter.name)
    expect(names).toContain('Natural')
    expect(names).not.toContain('Pastel')
    expect(res.body.find((filter: { name: string }) => filter.name === 'Black and white')).toEqual({
      id: expect.any(Number),
      name: 'Black and white',
      params: { grayscale: 1, contrast: 1.1 },
      isDefault: false,
    })
    expect(res.body.filter((filter: { isDefault: boolean }) => filter.isDefault)).toHaveLength(1)
  })
})

describe('GET /api/booth-settings', () => {
  it('returns only the settings the booth screen needs', async () => {
    const db = migratedDb()
    const res = await request(app(db)).get('/api/booth-settings')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      countdownSeconds: 3,
      captionText: 'Knowing Christ More!',
      captionLine2: 'JTFFC Batangas City',
      dateFormat: 'MMM d, yyyy',
      printPaper: '4x6',
    })
  })
})

describe('frame images', () => {
  it('installs the starter frames once and never overwrites an existing file', () => {
    const framesDir = tempDir('rato-frames-')
    writeFileSync(join(framesDir, 'starter-classic-v2.svg'), 'replaced by the admin')
    installStarterFrames(framesDir)
    expect(readFileSync(join(framesDir, 'starter-classic-v2.svg'), 'utf8')).toBe('replaced by the admin')
    expect(readFileSync(join(framesDir, 'starter-confetti.svg'), 'utf8')).toContain('<svg')
  })

  it('serves every seeded frame image, locked down so an SVG cannot run scripts', async () => {
    const db = migratedDb()
    const storageDir = tempDir('rato-storage-')
    mkdirSync(join(storageDir, 'frames'))
    installStarterFrames(join(storageDir, 'frames'))
    const server = createApp({ db, storageDir })
    const paths = db.prepare('SELECT DISTINCT image_path FROM frames').all().map((row) => String(row.image_path))
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      const res = await request(server).get(`/frames/${path}`)
      expect(res.status).toBe(200)
      expect(res.type).toBe('image/svg+xml')
      expect(res.headers['content-security-policy']).toContain("default-src 'none'")
    }
  })
})
