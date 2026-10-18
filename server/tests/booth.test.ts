import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Request, Response } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.ts'
import type { Database } from '../db/connection.ts'
import { boothOnly, isLoopback } from '../routes/booth.ts'
import { migratedDb, tempDir } from './helpers.ts'

// The smallest headers that pass the image checks; the server never decodes the pixels.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

interface Booth {
  db: Database
  storageDir: string
  server: ReturnType<typeof createApp>
}

function booth(): Booth {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  for (const folder of ['photos', 'strips', 'frames']) mkdirSync(join(storageDir, folder))
  return { db, storageDir, server: createApp({ db, storageDir }) }
}

function idOf(db: Database, sql: string): number {
  return Number(db.prepare(sql).get()?.id)
}

function choices(db: Database, shots = 2) {
  const layoutId = idOf(db, `SELECT id FROM layouts WHERE shots = ${shots}`)
  return {
    layoutId,
    frameId: idOf(db, `SELECT id FROM frames WHERE layout_id = ${layoutId} ORDER BY sort_order LIMIT 1`),
    filterId: idOf(db, 'SELECT id FROM filters WHERE is_default = 1'),
  }
}

async function startSession({ db, server }: Booth, shots = 2): Promise<number> {
  const res = await request(server).post('/api/sessions').send(choices(db, shots))
  expect(res.status).toBe(201)
  return res.body.id
}

function uploadPhoto({ server }: Booth, sessionId: number, shot: number, body = JPEG, type = 'image/jpeg') {
  return request(server).post(`/api/sessions/${sessionId}/photos/${shot}`).set('Content-Type', type).send(body)
}

function uploadStrip({ server }: Booth, sessionId: number, body = PNG, type = 'image/png') {
  return request(server).post(`/api/sessions/${sessionId}/strip`).set('Content-Type', type).send(body)
}

describe('POST /api/sessions', () => {
  it('records the guest choices and returns the session and shot count', async () => {
    const b = booth()
    const res = await request(b.server).post('/api/sessions').send(choices(b.db, 4))
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: expect.any(Number), shots: 4 })
    const row = b.db.prepare('SELECT layout_id, frame_id, filter_id FROM sessions WHERE id = ?').get(res.body.id)
    const { layoutId, frameId, filterId } = choices(b.db, 4)
    expect(row).toEqual({ layout_id: layoutId, frame_id: frameId, filter_id: filterId })
  })

  it('accepts no frame', async () => {
    const b = booth()
    const res = await request(b.server).post('/api/sessions').send({ ...choices(b.db), frameId: null })
    expect(res.status).toBe(201)
  })

  it('rejects unknown, disabled or mismatched choices', async () => {
    const b = booth()
    const valid = choices(b.db)
    const otherLayoutFrame = idOf(b.db, `SELECT id FROM frames WHERE layout_id != ${valid.layoutId} LIMIT 1`)
    b.db.prepare("UPDATE filters SET active = 0 WHERE name = 'Pastel'").run()
    const pastel = idOf(b.db, "SELECT id FROM filters WHERE name = 'Pastel'")
    const cases = [
      [{}, 'Choose a layout'],
      [{ ...valid, layoutId: 999 }, 'That layout is not available'],
      [{ ...valid, layoutId: '1' }, 'Choose a layout'],
      [{ ...valid, frameId: otherLayoutFrame }, 'That frame is not available for this layout'],
      [{ ...valid, filterId: pastel }, 'That filter is not available'],
      [{ ...valid, filterId: undefined }, 'Choose a filter'],
    ] as const
    for (const [body, error] of cases) {
      const res = await request(b.server).post('/api/sessions').send(body)
      expect(res.status, error).toBe(400)
      expect(res.body).toEqual({ error })
    }
    expect(b.db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(0)
  })
})

describe('POST /api/sessions/:id/photos/:shot', () => {
  it('stores a shot and replaces it on a retake', async () => {
    const b = booth()
    const id = await startSession(b)
    expect((await uploadPhoto(b, id, 1)).status).toBe(201)
    expect((await uploadPhoto(b, id, 1, PNG, 'image/png')).status).toBe(201)
    const rows = b.db.prepare('SELECT shot_number, image_path FROM photos WHERE session_id = ?').all(id)
    expect(rows).toEqual([{ shot_number: 1, image_path: `${id}-1.png` }])
    expect(readFileSync(join(b.storageDir, 'photos', `${id}-1.png`))).toEqual(PNG)
    // The replaced JPEG does not linger on disk.
    expect(existsSync(join(b.storageDir, 'photos', `${id}-1.jpg`))).toBe(false)
  })

  it('rejects a shot number outside the layout', async () => {
    const b = booth()
    const id = await startSession(b, 2)
    for (const shot of ['0', '3', 'x']) {
      const res = await request(b.server).post(`/api/sessions/${id}/photos/${shot}`).set('Content-Type', 'image/jpeg').send(JPEG)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'This layout has 2 shots' })
    }
  })

  it('rejects anything that is not a JPEG or PNG', async () => {
    const b = booth()
    const id = await startSession(b)
    const fake = await uploadPhoto(b, id, 1, Buffer.from('<svg onload="alert(1)">'), 'image/jpeg')
    expect(fake.status).toBe(415)
    expect(fake.body).toEqual({ error: 'Send a JPEG or PNG image' })
    const wrongType = await uploadPhoto(b, id, 1, JPEG, 'text/plain')
    expect(wrongType.status).toBe(415)
  })

  it('returns 404 for an unknown session', async () => {
    const res = await uploadPhoto(booth(), 42, 1)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Session not found' })
  })

  it('refuses changes once the strip is saved', async () => {
    const b = booth()
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    await uploadPhoto(b, id, 2)
    await uploadStrip(b, id)
    const res = await uploadPhoto(b, id, 1)
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'This strip is already finished' })
  })
})

describe('POST /api/sessions/:id/strip', () => {
  it('saves the strip privately with a share code', async () => {
    const b = booth()
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    await uploadPhoto(b, id, 2)
    const res = await uploadStrip(b, id)
    expect(res.status).toBe(201)
    const { shareCode } = res.body
    expect(shareCode).toMatch(/^[a-z2-9]{10}$/)
    expect(res.body).toEqual({ shareCode, imageUrl: `/api/strips/${shareCode}/image` })
    const row = b.db.prepare('SELECT image_path, is_public FROM strips WHERE session_id = ?').get(id)
    expect(row).toEqual({ image_path: `${shareCode}.png`, is_public: 0 })
    expect(readFileSync(join(b.storageDir, 'strips', `${shareCode}.png`))).toEqual(PNG)
  })

  it('marks the saved strip as a 300 dpi (2 x 6 inch) print', async () => {
    const b = booth()
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    await uploadPhoto(b, id, 2)
    const header = Buffer.alloc(13)
    header.writeUInt32BE(600, 0)
    header.writeUInt32BE(1800, 4)
    const ihdr = Buffer.concat([Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), header, Buffer.alloc(4)])
    const res = await uploadStrip(b, id, Buffer.concat([PNG.subarray(0, 8), ihdr]))
    const saved = readFileSync(join(b.storageDir, 'strips', `${res.body.shareCode}.png`))
    expect(saved.toString('ascii', 37, 41)).toBe('pHYs')
    expect(saved.readUInt32BE(41)).toBe(11811)
  })

  it('needs every shot first, and only once', async () => {
    const b = booth()
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    const early = await uploadStrip(b, id)
    expect(early.status).toBe(409)
    expect(early.body).toEqual({ error: 'Upload every shot first' })
    await uploadPhoto(b, id, 2)
    expect((await uploadStrip(b, id)).status).toBe(201)
    const again = await uploadStrip(b, id)
    expect(again.status).toBe(409)
    expect(again.body).toEqual({ error: 'This strip is already finished' })
  })

  it('accepts PNG only', async () => {
    const b = booth()
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    await uploadPhoto(b, id, 2)
    const res = await uploadStrip(b, id, JPEG, 'image/jpeg')
    expect(res.status).toBe(415)
    expect(res.body).toEqual({ error: 'Send the strip as a PNG image' })
  })
})

describe('GET /api/strips/:code', () => {
  async function finishedStrip(b: Booth): Promise<string> {
    const id = await startSession(b)
    await uploadPhoto(b, id, 1)
    await uploadPhoto(b, id, 2)
    return (await uploadStrip(b, id)).body.shareCode
  }

  it('returns the strip and its image', async () => {
    const b = booth()
    const code = await finishedStrip(b)
    const res = await request(b.server).get(`/api/strips/${code}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ shareCode: code, imageUrl: `/api/strips/${code}/image`, createdAt: expect.any(String) })
    const image = await request(b.server).get(`/api/strips/${code}/image`)
    expect(image.status).toBe(200)
    expect(image.type).toBe('image/png')
    expect(image.headers['x-content-type-options']).toBe('nosniff')
  })

  it('returns 404 for an unknown or malformed code', async () => {
    const b = booth()
    for (const code of ['abcdefghjk', '..%2F..%2Frato.db', 'A']) {
      for (const path of [`/api/strips/${code}`, `/api/strips/${code}/image`]) {
        const res = await request(b.server).get(path)
        expect(res.status, path).toBe(404)
        expect(res.body).toEqual({ error: 'Strip not found' })
      }
    }
  })
})

describe('booth-only writes', () => {
  it('knows the loopback addresses', () => {
    expect(['127.0.0.1', '::1', '::ffff:127.0.0.1'].map(isLoopback)).toEqual([true, true, true])
    expect(['192.168.1.20', '::ffff:192.168.1.20', undefined].map(isLoopback)).toEqual([false, false, false])
  })

  it('turns away requests from other devices on the Wi-Fi', () => {
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) } as unknown as Response
    const next = vi.fn()
    boothOnly({ socket: { remoteAddress: '192.168.1.20' } } as Request, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ error: 'Only the booth screen can do this' })

    boothOnly({ socket: { remoteAddress: '127.0.0.1' } } as Request, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
