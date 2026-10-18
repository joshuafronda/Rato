import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Database } from '../db/connection.ts'
import { type CloudBucket, syncCloudGallery } from '../services/cloud-gallery.ts'
import { migratedDb, tempDir } from './helpers.ts'

// Stands in for Firebase Storage: a map of online paths to their contents.
function fakeBucket(): CloudBucket & { files: Map<string, { data: Buffer; contentType: string }> } {
  const files = new Map<string, { data: Buffer; contentType: string }>()
  return {
    files,
    list: async (prefix) => [...files.keys()].filter((path) => path.startsWith(prefix)),
    upload: async (path, data, { contentType }) => {
      files.set(path, { data, contentType })
    },
    remove: async (path) => {
      files.delete(path)
    },
  }
}

function booth() {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  mkdirSync(join(storageDir, 'strips'))
  return { db, storageDir }
}

function addStrip(db: Database, storageDir: string, code: string, isPublic: boolean, createdAt: string): void {
  const layoutId = Number(db.prepare('SELECT id FROM layouts WHERE shots = 2').get()?.id)
  const sessionId = Number(db.prepare('INSERT INTO sessions (layout_id) VALUES (?)').run(layoutId).lastInsertRowid)
  writeFileSync(join(storageDir, 'strips', `${code}.png`), `png-${code}`)
  db.prepare('INSERT INTO strips (session_id, image_path, share_code, is_public, created_at) VALUES (?, ?, ?, ?, ?)').run(
    sessionId,
    `${code}.png`,
    code,
    isPublic ? 1 : 0,
    createdAt,
  )
}

function galleryIndex(bucket: ReturnType<typeof fakeBucket>): unknown {
  return JSON.parse(String(bucket.files.get('gallery.json')?.data))
}

describe('cloud gallery sync', () => {
  it('uploads only shared strips and a newest-first index', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    addStrip(db, storageDir, 'cccccccccc', false, '2026-10-18 11:00:00')
    const bucket = fakeBucket()

    expect(await syncCloudGallery(db, storageDir, bucket)).toEqual({ uploaded: 2, removed: 0 })
    expect([...bucket.files.keys()].sort()).toEqual(['gallery.json', 'strips/aaaaaaaaaa.png', 'strips/bbbbbbbbbb.png'])
    expect(String(bucket.files.get('strips/aaaaaaaaaa.png')?.data)).toBe('png-aaaaaaaaaa')
    expect(bucket.files.get('strips/aaaaaaaaaa.png')?.contentType).toBe('image/png')
    expect(galleryIndex(bucket)).toEqual({
      strips: [
        { code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
        { code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
      ],
    })
  })

  it('does nothing when the bucket already matches', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const bucket = fakeBucket()
    await syncCloudGallery(db, storageDir, bucket)
    expect(await syncCloudGallery(db, storageDir, bucket)).toEqual({ uploaded: 0, removed: 0 })
  })

  it('removes a strip that was unshared or deleted', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    const bucket = fakeBucket()
    await syncCloudGallery(db, storageDir, bucket)

    db.prepare("UPDATE strips SET is_public = 0 WHERE share_code = 'aaaaaaaaaa'").run()
    db.prepare("DELETE FROM sessions WHERE id = (SELECT session_id FROM strips WHERE share_code = 'bbbbbbbbbb')").run()
    expect(await syncCloudGallery(db, storageDir, bucket)).toEqual({ uploaded: 0, removed: 2 })
    expect([...bucket.files.keys()]).toEqual(['gallery.json'])
    expect(galleryIndex(bucket)).toEqual({ strips: [] })
  })

  it('takes everything down when the admin turns the gallery off', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const bucket = fakeBucket()
    await syncCloudGallery(db, storageDir, bucket)

    db.prepare("UPDATE settings SET value = 'false' WHERE key = 'gallery_enabled'").run()
    expect(await syncCloudGallery(db, storageDir, bucket)).toEqual({ uploaded: 0, removed: 1 })
    expect(galleryIndex(bucket)).toEqual({ strips: [] })
  })

  it('skips a shared strip whose file is missing instead of getting stuck', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    rmSync(join(storageDir, 'strips', 'aaaaaaaaaa.png'))
    const bucket = fakeBucket()

    expect(await syncCloudGallery(db, storageDir, bucket)).toEqual({ uploaded: 1, removed: 0 })
    expect(galleryIndex(bucket)).toEqual({ strips: [{ code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' }] })
  })

  it('writes the index on the first run even with nothing shared', async () => {
    const { db, storageDir } = booth()
    const bucket = fakeBucket()
    await syncCloudGallery(db, storageDir, bucket)
    expect(galleryIndex(bucket)).toEqual({ strips: [] })
  })
})
