import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import type { Database } from '../db/connection.ts'
import { schemaVersion } from '../db/migrate.ts'
import { migratedDb, tempDir } from './helpers.ts'

function clientDir(): string {
  const dir = tempDir('rato-client-')
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Rato</title>')
  return dir
}

function app(db: Database = migratedDb(), client?: string) {
  return createApp({ db, storageDir: tempDir('rato-storage-'), clientDir: client })
}

describe('GET /api/health', () => {
  it('reports the server and database are up', async () => {
    const db = migratedDb()
    const res = await request(app(db)).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, database: 'ok', schemaVersion: schemaVersion(db) })
    expect(res.body.schemaVersion).toBeGreaterThan(0)
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app()).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON error, not an HTML stack trace, when the database fails', async () => {
    const db = migratedDb()
    db.close()
    const res = await request(app(db)).get('/api/health')
    expect(res.status).toBe(500)
    expect(res.type).toBe('application/json')
    expect(res.body).toEqual({ error: 'Something went wrong' })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const res = await request(app())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{not json')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Bad request' })
  })
})

describe('client pages', () => {
  it('serves index.html for booth routes', async () => {
    const res = await request(app(migratedDb(), clientDir())).get('/booth')
    expect(res.status).toBe(200)
    expect(res.text).toContain('<title>Rato</title>')
  })

  it('returns a JSON 404 for a missing asset instead of index.html', async () => {
    const res = await request(app(migratedDb(), clientDir())).get('/assets/index-old.js')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON 413 for a body over the limit', async () => {
    const res = await request(app())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ big: 'x'.repeat(1_100_000) }))
    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'Request too large' })
  })
})

describe('GET /rato-booth-ca.crt', () => {
  it('lets an iPad download the booth certificate authority to trust', async () => {
    const caCert = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n'
    const server = createApp({ db: migratedDb(), storageDir: tempDir('rato-storage-'), boothCaCert: caCert })
    const res = await request(server).get('/rato-booth-ca.crt')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/x-x509-ca-cert/)
    expect(res.text).toBe(caCert)
  })

  it('does not exist while other devices may not run the booth', async () => {
    expect((await request(app()).get('/rato-booth-ca.crt')).status).toBe(404)
  })
})
