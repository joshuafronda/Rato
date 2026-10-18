import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import type { Database } from '../db/connection.ts'
import { lanAddress, shareBaseUrl } from '../services/network.ts'
import { migratedDb, tempDir } from './helpers.ts'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

function booth() {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  for (const folder of ['photos', 'strips', 'frames']) mkdirSync(join(storageDir, folder))
  const server = createApp({ db, storageDir, shareBaseUrl: () => 'http://192.168.1.20:3000' })
  return { db, server }
}

async function makeStrip({ db, server }: { db: Database; server: ReturnType<typeof createApp> }): Promise<string> {
  const layoutId = Number(db.prepare('SELECT id FROM layouts WHERE shots = 2').get()?.id)
  const filterId = Number(db.prepare('SELECT id FROM filters WHERE is_default = 1').get()?.id)
  const session = await request(server).post('/api/sessions').send({ layoutId, frameId: null, filterId })
  for (const shot of [1, 2]) {
    await request(server).post(`/api/sessions/${session.body.id}/photos/${shot}`).set('Content-Type', 'image/jpeg').send(JPEG)
  }
  const strip = await request(server).post(`/api/sessions/${session.body.id}/strip`).set('Content-Type', 'image/png').send(PNG)
  return strip.body.shareCode
}

describe('gallery', () => {
  it('shows only strips a guest chose to share, newest first', async () => {
    const b = booth()
    const first = await makeStrip(b)
    const second = await makeStrip(b)
    await makeStrip(b) // never shared
    for (const code of [first, second]) {
      const res = await request(b.server).post(`/api/strips/${code}/visibility`).send({ isPublic: true })
      expect(res.body).toEqual({ isPublic: true })
    }
    b.db.prepare("UPDATE strips SET created_at = datetime('now', '-1 hour') WHERE share_code = ?").run(first)
    const res = await request(b.server).get('/api/gallery')
    expect(res.body.enabled).toBe(true)
    expect(res.body.strips.map((strip: { shareCode: string }) => strip.shareCode)).toEqual([second, first])
    expect(res.body.strips[0]).toEqual({ shareCode: second, imageUrl: `/api/strips/${second}/image`, createdAt: expect.any(String) })

    await request(b.server).post(`/api/strips/${second}/visibility`).send({ isPublic: false })
    const after = await request(b.server).get('/api/gallery?limit=1')
    expect(after.body.strips.map((strip: { shareCode: string }) => strip.shareCode)).toEqual([first])
  })

  it('is empty when the admin turned the gallery off', async () => {
    const b = booth()
    const code = await makeStrip(b)
    await request(b.server).post(`/api/strips/${code}/visibility`).send({ isPublic: true })
    b.db.prepare("UPDATE settings SET value = 'false' WHERE key = 'gallery_enabled'").run()
    expect((await request(b.server).get('/api/gallery')).body).toEqual({ enabled: false, strips: [] })
  })

  it('rejects a bad visibility request', async () => {
    const b = booth()
    const code = await makeStrip(b)
    expect((await request(b.server).post(`/api/strips/${code}/visibility`).send({ isPublic: 'yes' })).status).toBe(400)
    expect((await request(b.server).post('/api/strips/abcdefghjk/visibility').send({ isPublic: true })).status).toBe(404)
  })
})

describe('share link', () => {
  it('returns the phone link and its QR code', async () => {
    const b = booth()
    const code = await makeStrip(b)
    const res = await request(b.server).get(`/api/strips/${code}/share`)
    expect(res.status).toBe(200)
    expect(res.body.url).toBe(`http://192.168.1.20:3000/s/${code}`)
    expect(res.body.qrSvg).toMatch(/^<svg[^>]*>.*<path/s)
    expect(res.body.onlineGallery).toBe(false)
    expect((await request(b.server).get('/api/strips/abcdefghjk/share')).status).toBe(404)
  })

  it('tells the booth when shared strips also go to the online gallery', async () => {
    const db = migratedDb()
    const storageDir = tempDir('rato-storage-')
    for (const folder of ['photos', 'strips', 'frames']) mkdirSync(join(storageDir, folder))
    const server = createApp({ db, storageDir, onlineGallery: true })
    const code = await makeStrip({ db, server })
    expect((await request(server).get(`/api/strips/${code}/share`)).body.onlineGallery).toBe(true)
  })
})

describe('print queue', () => {
  it('queues a print, hands it out once, and counts the copies when printed', async () => {
    const b = booth()
    const code = await makeStrip(b)
    const queued = await request(b.server).post(`/api/strips/${code}/prints`).send({ copies: 2 })
    expect(queued.status).toBe(201)

    const claim = await request(b.server).post('/api/print-queue/claim')
    expect(claim.body).toEqual({ job: { id: queued.body.id, copies: 2, imageUrl: `/api/strips/${code}/image` } })
    expect((await request(b.server).post('/api/print-queue/claim')).body).toEqual({ job: null })

    const done = await request(b.server).post(`/api/print-queue/${queued.body.id}/finish`).send({ printed: true })
    expect(done.status).toBe(200)
    expect(b.db.prepare('SELECT print_count FROM strips WHERE share_code = ?').get(code)?.print_count).toBe(2)
    expect(b.db.prepare('SELECT status FROM print_jobs').get()?.status).toBe('printed')
    // A job cannot be finished twice.
    expect((await request(b.server).post(`/api/print-queue/${queued.body.id}/finish`).send({ printed: true })).status).toBe(404)
  })

  it('records a failed print without counting it', async () => {
    const b = booth()
    const code = await makeStrip(b)
    const queued = await request(b.server).post(`/api/strips/${code}/prints`).send({ copies: 1 })
    await request(b.server).post('/api/print-queue/claim')
    await request(b.server).post(`/api/print-queue/${queued.body.id}/finish`).send({ printed: false })
    expect(b.db.prepare('SELECT status FROM print_jobs').get()?.status).toBe('failed')
    expect(b.db.prepare('SELECT print_count FROM strips').get()?.print_count).toBe(0)
  })

  it('allows 1 to 3 copies only', async () => {
    const b = booth()
    const code = await makeStrip(b)
    for (const copies of [0, 4, 1.5, '2']) {
      const res = await request(b.server).post(`/api/strips/${code}/prints`).send({ copies })
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'Choose 1 to 3 copies' })
    }
  })
})

describe('shareBaseUrl', () => {
  const wifi = {
    lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    vEthernet: [{ family: 'IPv4', internal: false, address: '100.64.0.5' }],
    WiFi: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }],
  } as unknown as Parameters<typeof lanAddress>[0]

  it('prefers the Wi-Fi address, and an override wins', () => {
    expect(lanAddress(wifi)).toBe('192.168.1.20')
    expect(shareBaseUrl(3000, '', wifi)).toBe('http://192.168.1.20:3000')
    expect(shareBaseUrl(3000, 'booth.local', wifi)).toBe('http://booth.local:3000')
    expect(shareBaseUrl(3000, '', {})).toBe('http://localhost:3000')
  })
})
