import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { migratedDb, tempDir } from './helpers.ts'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

// The file names in a zip, read from its central directory.
function zipEntries(zip: Buffer): string[] {
  const names: string[] = []
  for (let at = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); at !== -1; ) {
    const nameLength = zip.readUInt16LE(at + 28)
    const extraLength = zip.readUInt16LE(at + 30)
    const commentLength = zip.readUInt16LE(at + 32)
    names.push(zip.toString('utf8', at + 46, at + 46 + nameLength))
    const next = at + 46 + nameLength + extraLength + commentLength
    at = zip.readUInt32LE(next) === 0x02014b50 ? next : -1
  }
  return names
}

async function setup() {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  for (const folder of ['photos', 'strips', 'frames']) mkdirSync(join(storageDir, folder))
  const server = createApp({ db, storageDir })
  const login = await request(server).post('/api/admin/accounts').send({ username: 'host', password: 'correct horse' })
  const cookie = String(login.headers['set-cookie']).split(';')[0]

  const layoutId = Number(db.prepare('SELECT id FROM layouts WHERE shots = 2').get()?.id)
  const filterId = Number(db.prepare('SELECT id FROM filters WHERE is_default = 1').get()?.id)
  const makeStrip = async (createdAt: string) => {
    const session = await request(server).post('/api/sessions').send({ layoutId, frameId: null, filterId })
    for (const shot of [1, 2]) {
      await request(server).post(`/api/sessions/${session.body.id}/photos/${shot}`).set('Content-Type', 'image/jpeg').send(JPEG)
    }
    const strip = await request(server).post(`/api/sessions/${session.body.id}/strip`).set('Content-Type', 'image/png').send(PNG)
    // Stored in UTC like SQLite's datetime('now'); noon UTC is the same date in every time zone ±11h.
    db.prepare('UPDATE strips SET created_at = ? WHERE share_code = ?').run(createdAt, strip.body.shareCode)
    return strip.body.shareCode as string
  }
  return { db, storageDir, server, cookie, makeStrip }
}

function download(server: ReturnType<typeof createApp>, cookie: string, query: string) {
  return request(server)
    .get(`/api/admin/download${query}`)
    .set('Cookie', cookie)
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => done(null, Buffer.concat(chunks)))
    })
}

describe('downloads by day', () => {
  it('lists the days that have strips, newest first', async () => {
    const s = await setup()
    await s.makeStrip('2026-10-17 12:00:00')
    await s.makeStrip('2026-10-18 12:00:00')
    await s.makeStrip('2026-10-18 12:30:00')
    const res = await request(s.server).get('/api/admin/strip-days').set('Cookie', s.cookie)
    expect(res.body).toEqual([
      { day: '2026-10-18', strips: 2 },
      { day: '2026-10-17', strips: 1 },
    ])
    const day = await request(s.server).get('/api/admin/strips?date=2026-10-17').set('Cookie', s.cookie)
    expect(day.body).toHaveLength(1)
  })

  it('zips one day of strips, and the original shots when asked', async () => {
    const s = await setup()
    const older = await s.makeStrip('2026-10-17 12:00:00')
    const code = await s.makeStrip('2026-10-18 12:00:00')

    const strips = await download(s.server, s.cookie, '?date=2026-10-18')
    expect(strips.status).toBe(200)
    expect(strips.headers['content-type']).toBe('application/zip')
    expect(strips.headers['content-disposition']).toContain('rato-2026-10-18.zip')
    const names = zipEntries(strips.body)
    expect(names).toHaveLength(1)
    expect(names[0]).toMatch(new RegExp(`^2026-10-18/strips/\\d\\d-\\d\\d-\\d\\d-${code}\\.png$`))

    const withPhotos = await download(s.server, s.cookie, '?date=2026-10-18&photos=1')
    expect(withPhotos.headers['content-disposition']).toContain('rato-2026-10-18-with-photos.zip')
    expect(zipEntries(withPhotos.body).map((name) => name.split('/')[1])).toEqual(['strips', 'photos', 'photos'])
    expect(zipEntries(withPhotos.body).join()).not.toContain(older)

    const everything = await download(s.server, s.cookie, '')
    expect(zipEntries(everything.body)).toHaveLength(2)
  })

  it('skips files missing from disk, and says when a day has nothing', async () => {
    const s = await setup()
    const code = await s.makeStrip('2026-10-18 12:00:00')
    rmSync(join(s.storageDir, 'photos', '1-1.jpg'))
    const res = await download(s.server, s.cookie, '?date=2026-10-18&photos=1')
    expect(zipEntries(res.body).map((name) => name.split('/')[1])).toEqual(['strips', 'photos'])
    expect(zipEntries(res.body)[0]).toContain(code)

    const empty = await request(s.server).get('/api/admin/download?date=2020-01-01').set('Cookie', s.cookie)
    expect(empty.status).toBe(404)
    expect(empty.body).toEqual({ error: 'There are no strips for that day' })
    const bad = await request(s.server).get('/api/admin/download?date=yesterday').set('Cookie', s.cookie)
    expect(bad.status).toBe(400)
  })

  it('needs an admin', async () => {
    const s = await setup()
    expect((await request(s.server).get('/api/admin/download')).status).toBe(401)
  })
})
