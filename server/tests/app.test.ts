import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { type Database, openDatabase } from '../db/connection.ts'
import { runMigrations, schemaVersion } from '../db/migrate.ts'

const opened: Database[] = []
const tempDirs: string[] = []

function migratedDb(): Database {
  const db = openDatabase(':memory:')
  opened.push(db)
  runMigrations(db)
  return db
}

function clientDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rato-client-'))
  tempDirs.push(dir)
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Rato</title>')
  return dir
}

afterEach(() => {
  for (const db of opened.splice(0)) if (db.isOpen) db.close()
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('GET /api/health', () => {
  it('reports the server and database are up', async () => {
    const db = migratedDb()
    const res = await request(createApp({ db })).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, database: 'ok', schemaVersion: schemaVersion(db) })
    expect(res.body.schemaVersion).toBeGreaterThan(0)
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(createApp({ db: migratedDb() })).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON error, not an HTML stack trace, when the database fails', async () => {
    const db = migratedDb()
    db.close()
    const res = await request(createApp({ db })).get('/api/health')
    expect(res.status).toBe(500)
    expect(res.type).toBe('application/json')
    expect(res.body).toEqual({ error: 'Something went wrong' })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const res = await request(createApp({ db: migratedDb() }))
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{not json')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Bad request' })
  })
})

describe('client pages', () => {
  it('serves index.html for booth routes', async () => {
    const res = await request(createApp({ db: migratedDb(), clientDir: clientDir() })).get('/booth')
    expect(res.status).toBe(200)
    expect(res.text).toContain('<title>Rato</title>')
  })

  it('returns a JSON 404 for a missing asset instead of index.html', async () => {
    const res = await request(createApp({ db: migratedDb(), clientDir: clientDir() })).get('/assets/index-old.js')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON 413 for a body over the limit', async () => {
    const res = await request(createApp({ db: migratedDb() }))
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ big: 'x'.repeat(1_100_000) }))
    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'Request too large' })
  })
})
