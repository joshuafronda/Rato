import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { openDatabase } from '../db/connection.ts'
import { runMigrations } from '../db/migrate.ts'

function testApp() {
  const db = openDatabase(':memory:')
  runMigrations(db)
  return createApp({ db })
}

describe('GET /api/health', () => {
  it('reports the server and database are up', async () => {
    const res = await request(testApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, database: 'ok', schemaVersion: 2 })
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(testApp()).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })
})
