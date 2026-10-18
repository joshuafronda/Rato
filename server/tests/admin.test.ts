import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.ts'
import type { Database } from '../db/connection.ts'
import type { Request, Response } from 'express'
import { accountsOnLaptop } from '../routes/admin.ts'
import { LoginLimiter } from '../services/admin-auth.ts'
import { deleteExpiredSessions } from '../services/cleanup.ts'
import { hashPassword, verifyPassword } from '../services/passwords.ts'
import { migratedDb, tempDir } from './helpers.ts'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

// A PNG header with the given size; the server reads only the header.
function pngOfSize(width: number, height: number): Buffer {
  const header = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header)
  header.writeUInt32BE(13, 8)
  header.write('IHDR', 12, 'ascii')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

function setup() {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  const backupDir = tempDir('rato-backups-')
  for (const folder of ['photos', 'strips', 'frames']) mkdirSync(join(storageDir, folder))
  return { db, storageDir, backupDir, server: createApp({ db, storageDir, backupDir }) }
}

type Setup = ReturnType<typeof setup>

// Creates the admin and returns the session cookie.
async function signedIn({ server }: Setup): Promise<string> {
  const res = await request(server).post('/api/admin/accounts').send({ username: 'host', password: 'correct horse' })
  expect(res.status).toBe(201)
  return String(res.headers['set-cookie']).split(';')[0]
}

async function makeStrip({ db, server }: Setup): Promise<{ sessionId: number; shareCode: string }> {
  const layoutId = Number(db.prepare('SELECT id FROM layouts WHERE shots = 2').get()?.id)
  const frameId = Number(db.prepare(`SELECT id FROM frames WHERE layout_id = ${layoutId} LIMIT 1`).get()?.id)
  const filterId = Number(db.prepare('SELECT id FROM filters WHERE is_default = 1').get()?.id)
  const session = await request(server).post('/api/sessions').send({ layoutId, frameId, filterId })
  for (const shot of [1, 2]) {
    await request(server).post(`/api/sessions/${session.body.id}/photos/${shot}`).set('Content-Type', 'image/jpeg').send(JPEG)
  }
  const strip = await request(server).post(`/api/sessions/${session.body.id}/strip`).set('Content-Type', 'image/png').send(PNG)
  return { sessionId: session.body.id, shareCode: strip.body.shareCode }
}

function idOf(db: Database, sql: string): number {
  return Number(db.prepare(sql).get()?.id)
}

describe('passwords', () => {
  it('hashes with a salt and verifies', () => {
    const hash = hashPassword('correct horse')
    expect(hash).toMatch(/^scrypt\$/)
    expect(hash).not.toContain('correct horse')
    expect(hashPassword('correct horse')).not.toBe(hash)
    expect(verifyPassword('correct horse', hash)).toBe(true)
    expect(verifyPassword('wrong horse', hash)).toBe(false)
    expect(verifyPassword('x', 'not-a-hash')).toBe(false)
  })
})

describe('admin sign-in', () => {
  it('creates accounts with a strict HttpOnly cookie, and refuses a taken username', async () => {
    const s = setup()
    expect((await request(s.server).get('/api/admin/status')).body).toEqual({ setupNeeded: true, username: null })
    const res = await request(s.server).post('/api/admin/accounts').send({ username: 'host', password: 'correct horse' })
    expect(res.status).toBe(201)
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/rato_admin=[\w-]{43};/)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    const taken = await request(s.server).post('/api/admin/accounts').send({ username: 'HOST', password: 'another one' })
    expect(taken.status).toBe(409)
    expect(taken.body).toEqual({ error: 'That username is taken' })
    const second = await request(s.server).post('/api/admin/accounts').send({ username: 'helper', password: 'another one' })
    expect(second.status).toBe(201)
    const helper = await request(s.server).post('/api/admin/login').send({ username: 'helper', password: 'another one' })
    expect(helper.status).toBe(200)
    const status = await request(s.server).get('/api/admin/status').set('Cookie', cookie.split(';')[0])
    expect(status.body).toEqual({ setupNeeded: false, username: 'host' })
  })

  it('explains that accounts are created on the laptop when opened from another address', () => {
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) } as unknown as Response
    const next = vi.fn()
    accountsOnLaptop({ socket: { remoteAddress: '192.168.1.15' } } as Request, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ error: expect.stringContaining('http://localhost:3000/admin') })
  })

  it('refuses a short password', async () => {
    const res = await request(setup().server).post('/api/admin/accounts').send({ username: 'host', password: 'short' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Choose a password of at least 8 characters' })
  })

  it('logs in and out', async () => {
    const s = setup()
    await signedIn(s)
    const wrong = await request(s.server).post('/api/admin/login').send({ username: 'host', password: 'wrong horse' })
    expect(wrong.status).toBe(401)
    expect(wrong.body).toEqual({ error: 'Wrong username or password' })
    const unknown = await request(s.server).post('/api/admin/login').send({ username: 'nobody', password: 'correct horse' })
    expect(unknown.status).toBe(401)

    const res = await request(s.server).post('/api/admin/login').send({ username: 'HOST', password: 'correct horse' })
    expect(res.status).toBe(200)
    const cookie = String(res.headers['set-cookie']).split(';')[0]
    expect((await request(s.server).get('/api/admin/overview').set('Cookie', cookie)).status).toBe(200)
    await request(s.server).post('/api/admin/logout').set('Cookie', cookie)
    expect((await request(s.server).get('/api/admin/overview').set('Cookie', cookie)).status).toBe(401)
  })

  it('keeps every admin route behind sign-in', async () => {
    const s = setup()
    for (const path of ['overview', 'layouts', 'frames', 'filters', 'strips', 'print-jobs', 'settings']) {
      const res = await request(s.server).get(`/api/admin/${path}`)
      expect(res.status, path).toBe(401)
      expect(res.body).toEqual({ error: 'Sign in first' })
    }
    const forged = await request(s.server).get('/api/admin/overview').set('Cookie', 'rato_admin=made-up')
    expect(forged.status).toBe(401)
  })

  it('refuses form posts from other sites', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const res = await request(s.server)
      .put('/api/admin/settings')
      .set('Cookie', cookie)
      .set('Content-Type', 'text/plain')
      .send('{"galleryEnabled":false}')
    expect(res.status).toBe(415)
  })

  it('locks an address out after five wrong passwords', () => {
    let now = 0
    const limiter = new LoginLimiter(() => now)
    for (let i = 0; i < 4; i += 1) limiter.fail('1.2.3.4')
    expect(limiter.isLocked('1.2.3.4')).toBe(false)
    limiter.fail('1.2.3.4')
    expect(limiter.isLocked('1.2.3.4')).toBe(true)
    expect(limiter.isLocked('5.6.7.8')).toBe(false)
    now = 61_000
    expect(limiter.isLocked('1.2.3.4')).toBe(false)
  })
})

describe('admin dashboard', () => {
  it('reports the overview', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const { shareCode } = await makeStrip(s)
    await makeStrip(s)
    s.db.prepare('UPDATE strips SET print_count = 3 WHERE share_code = ?').run(shareCode)
    const res = await request(s.server).get('/api/admin/overview').set('Cookie', cookie)
    expect(res.body).toEqual({
      sessionsToday: 2,
      totalStrips: 2,
      totalPrints: 3,
      peakHours: [{ hour: expect.any(Number), sessions: 2 }],
      mostUsedFrame: { name: 'Classic', sessions: 2 },
    })
  })

  it('uploads a 1:3 PNG frame and refuses other files', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const layoutId = idOf(s.db, 'SELECT id FROM layouts WHERE shots = 3')
    const upload = (body: Buffer, type = 'image/png', name = 'Gold') =>
      request(s.server).post(`/api/admin/frames?layoutId=${layoutId}&name=${name}`).set('Cookie', cookie).set('Content-Type', type).send(body)

    const res = await upload(pngOfSize(600, 1800))
    expect(res.status).toBe(201)
    const frames = (await request(s.server).get(`/api/frames?layoutId=${layoutId}`)).body
    expect(frames.at(-1)).toMatchObject({ id: res.body.id, name: 'Gold', imageUrl: expect.stringMatching(/^\/frames\/frame-[0-9a-f]{16}\.png$/) })
    expect(readdirSync(join(s.storageDir, 'frames'))).toHaveLength(1)

    expect((await upload(pngOfSize(600, 900))).status).toBe(400)
    expect((await upload(Buffer.from('<svg onload="alert(1)"/>'), 'image/svg+xml')).status).toBe(415)
    expect((await upload(JPEG, 'image/png')).status).toBe(415)
    expect((await upload(pngOfSize(600, 1800), 'image/png', '')).status).toBe(400)
  })

  it('turns frames and layouts off and reorders frames', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const layoutId = idOf(s.db, 'SELECT id FROM layouts WHERE shots = 4')
    const ids = s.db.prepare('SELECT id FROM frames WHERE layout_id = ? ORDER BY sort_order').all(layoutId).map((row) => Number(row.id))

    await request(s.server).post('/api/admin/frames/reorder').set('Cookie', cookie).send({ layoutId, ids: [...ids].reverse() })
    expect((await request(s.server).get(`/api/frames?layoutId=${layoutId}`)).body.map((f: { id: number }) => f.id)).toEqual([...ids].reverse())
    const bad = await request(s.server).post('/api/admin/frames/reorder').set('Cookie', cookie).send({ layoutId, ids: [ids[0]] })
    expect(bad.status).toBe(400)

    await request(s.server).patch(`/api/admin/frames/${ids[0]}`).set('Cookie', cookie).send({ active: false, name: 'Plain' })
    expect((await request(s.server).get(`/api/frames?layoutId=${layoutId}`)).body.map((f: { id: number }) => f.id)).toEqual([ids[1]])
    const all = (await request(s.server).get('/api/admin/frames').set('Cookie', cookie)).body
    expect(all.find((f: { id: number }) => f.id === ids[0])).toMatchObject({ name: 'Plain', active: false })

    await request(s.server).patch(`/api/admin/layouts/${layoutId}`).set('Cookie', cookie).send({ active: false })
    expect((await request(s.server).get('/api/layouts')).body.map((l: { shots: number }) => l.shots)).toEqual([2, 3])
  })

  it('keeps one active default filter', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const natural = idOf(s.db, "SELECT id FROM filters WHERE name = 'Natural'")
    const warm = idOf(s.db, "SELECT id FROM filters WHERE name = 'Warm'")
    const off = await request(s.server).patch(`/api/admin/filters/${natural}`).set('Cookie', cookie).send({ active: false })
    expect(off.status).toBe(400)

    await request(s.server).patch(`/api/admin/filters/${warm}`).set('Cookie', cookie).send({ active: false })
    await request(s.server).post(`/api/admin/filters/${warm}/default`).set('Cookie', cookie)
    const filters = (await request(s.server).get('/api/admin/filters').set('Cookie', cookie)).body
    expect(filters.filter((f: { isDefault: boolean }) => f.isDefault)).toEqual([{ id: warm, name: 'Warm', active: true, isDefault: true }])
    expect((await request(s.server).patch(`/api/admin/filters/${natural}`).set('Cookie', cookie).send({ active: false })).status).toBe(200)
  })

  it('hides and deletes strips, files included', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const { shareCode } = await makeStrip(s)
    await request(s.server).post(`/api/strips/${shareCode}/visibility`).send({ isPublic: true })
    const [strip] = (await request(s.server).get('/api/admin/strips').set('Cookie', cookie)).body
    expect(strip).toMatchObject({ shareCode, isPublic: true, printCount: 0 })

    await request(s.server).patch(`/api/admin/strips/${strip.id}`).set('Cookie', cookie).send({ isPublic: false })
    expect((await request(s.server).get('/api/gallery')).body.strips).toEqual([])

    const res = await request(s.server).delete(`/api/admin/strips/${strip.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(readdirSync(join(s.storageDir, 'photos'))).toEqual([])
    expect(readdirSync(join(s.storageDir, 'strips'))).toEqual([])
    expect(s.db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(0)
    expect((await request(s.server).get(`/api/strips/${shareCode}`)).status).toBe(404)
  })

  it('lists print jobs and queues a reprint for the booth', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const { shareCode } = await makeStrip(s)
    const job = await request(s.server).post(`/api/strips/${shareCode}/prints`).send({ copies: 2 })
    await request(s.server).post('/api/print-queue/claim')
    await request(s.server).post(`/api/print-queue/${job.body.id}/finish`).send({ printed: true })

    const jobs = (await request(s.server).get('/api/admin/print-jobs').set('Cookie', cookie)).body
    expect(jobs).toEqual([{ id: job.body.id, copies: 2, status: 'printed', createdAt: expect.any(String), shareCode, imageUrl: `/api/strips/${shareCode}/image` }])

    const again = await request(s.server).post(`/api/admin/print-jobs/${job.body.id}/reprint`).set('Cookie', cookie)
    expect(again.status).toBe(201)
    expect((await request(s.server).post('/api/print-queue/claim')).body.job).toMatchObject({ id: again.body.id, copies: 2 })
  })

  it('reads and validates settings', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    const res = await request(s.server).get('/api/admin/settings').set('Cookie', cookie)
    expect(res.body).toEqual({
      countdownSeconds: 3,
      captionText: '',
      dateFormat: 'MMM d, yyyy',
      printer: '',
      printPaper: '4x6',
      galleryEnabled: true,
      autoDeleteDays: 0,
    })
    const saved = await request(s.server)
      .put('/api/admin/settings')
      .set('Cookie', cookie)
      .send({ countdownSeconds: 5, captionText: ' Ana & Ben ', galleryEnabled: false, printPaper: '2x6' })
    expect(saved.body).toMatchObject({ countdownSeconds: 5, captionText: 'Ana & Ben', galleryEnabled: false, printPaper: '2x6' })
    expect((await request(s.server).get('/api/booth-settings')).body).toMatchObject({ countdownSeconds: 5, captionText: 'Ana & Ben' })

    for (const bad of [{ countdownSeconds: 0 }, { autoDeleteDays: 400 }, { captionText: 'x'.repeat(41) }, { printPaper: 'A4' }, { nope: 1 }]) {
      const res = await request(s.server).put('/api/admin/settings').set('Cookie', cookie).send(bad)
      expect(res.status, JSON.stringify(bad)).toBe(400)
    }
  })

  it('writes a backup folder with the database and files', async () => {
    const s = setup()
    const cookie = await signedIn(s)
    await makeStrip(s)
    const res = await request(s.server).post('/api/admin/backup').set('Cookie', cookie)
    expect(res.status).toBe(201)
    expect(res.body.path.startsWith(s.backupDir)).toBe(true)
    expect(readdirSync(res.body.path).sort()).toEqual(['frames', 'photos', 'rato.db', 'strips'])
    expect(readdirSync(join(res.body.path, 'photos'))).toHaveLength(2)
  })
})

describe('auto-delete', () => {
  it('is off by default and removes old sessions with their files when set', async () => {
    const s = setup()
    const { sessionId } = await makeStrip(s)
    await makeStrip(s)
    s.db.prepare("UPDATE sessions SET created_at = datetime('now', '-3 days') WHERE id = ?").run(sessionId)
    expect(deleteExpiredSessions(s.db, s.storageDir)).toBe(0)

    s.db.prepare("UPDATE settings SET value = '2' WHERE key = 'auto_delete_days'").run()
    expect(deleteExpiredSessions(s.db, s.storageDir)).toBe(1)
    expect(s.db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(1)
    expect(readdirSync(join(s.storageDir, 'photos'))).toHaveLength(2)
    expect(existsSync(join(s.storageDir, 'photos', `${sessionId}-1.jpg`))).toBe(false)
  })
})
