import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Database } from '../db/connection.ts'
import { type CloudBucket, cloudGallerySync } from '../services/cloud-gallery.ts'
import { migratedDb, tempDir } from './helpers.ts'

interface StoredFile {
  data: Buffer
  contentType: string
  cacheControl: string
}

// Stands in for Firebase Storage: a map of online paths to their contents, plus a log of every
// write so a test can check that nothing was sent.
function fakeBucket() {
  const files = new Map<string, StoredFile>()
  const writes: string[] = []
  const failing = new Map<string, number>()
  const bucket: CloudBucket = {
    list: async (prefix) => [...files.keys()].filter((path) => path.startsWith(prefix)),
    upload: async (path, data, { contentType, cacheControl }) => {
      const failuresLeft = failing.get(path) ?? 0
      if (failuresLeft > 0) {
        failing.set(path, failuresLeft - 1)
        throw new Error('network down')
      }
      writes.push(`upload ${path}`)
      files.set(path, { data, contentType, cacheControl })
    },
    remove: async (path) => {
      writes.push(`remove ${path}`)
      files.delete(path)
    },
  }
  return {
    bucket,
    files,
    writes,
    fail: (path: string, times: number) => {
      failing.set(path, times)
    },
  }
}

function booth() {
  const db = migratedDb()
  const storageDir = tempDir('rato-storage-')
  mkdirSync(join(storageDir, 'strips'))
  return { db, storageDir }
}

// Shared strips get online consent unless onlineOk says otherwise.
function addStrip(db: Database, storageDir: string, code: string, isPublic: boolean, createdAt: string, onlineOk = isPublic): void {
  const layoutId = Number(db.prepare('SELECT id FROM layouts WHERE shots = 2').get()?.id)
  const sessionId = Number(db.prepare('INSERT INTO sessions (layout_id) VALUES (?)').run(layoutId).lastInsertRowid)
  writeFileSync(join(storageDir, 'strips', `${code}.png`), `png-${code}`)
  db.prepare(
    'INSERT INTO strips (session_id, image_path, share_code, is_public, online_ok, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(sessionId, `${code}.png`, code, isPublic ? 1 : 0, onlineOk ? 1 : 0, createdAt)
}

function galleryIndex(files: Map<string, StoredFile>): unknown {
  return JSON.parse(String(files.get('gallery.json')?.data))
}

describe('cloud gallery sync', () => {
  it('uploads only shared strips and a newest-first index', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    addStrip(db, storageDir, 'cccccccccc', false, '2026-10-18 11:00:00')
    const { bucket, files } = fakeBucket()

    expect(await cloudGallerySync(db, storageDir, bucket)()).toEqual({ uploaded: 2, removed: 0 })
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/aaaaaaaaaa.png', 'strips/bbbbbbbbbb.png'])
    expect(files.get('strips/aaaaaaaaaa.png')).toEqual({
      data: Buffer.from('png-aaaaaaaaaa'),
      contentType: 'image/png',
      cacheControl: 'private, max-age=3600',
    })
    expect(files.get('gallery.json')?.cacheControl).toBe('no-cache')
    expect(galleryIndex(files)).toEqual({
      strips: [
        { code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
        { code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
      ],
    })
  })

  it('keeps a shared strip off the internet when the guest never saw the online wording', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00', false)
    const { bucket, files } = fakeBucket()
    expect(await cloudGallerySync(db, storageDir, bucket)()).toEqual({ uploaded: 0, removed: 0 })
    expect([...files.keys()]).toEqual(['gallery.json'])
  })

  it('still drops a withdrawn strip from the index while another upload keeps failing', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, files, fail } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket)
    await sync()

    db.prepare("UPDATE strips SET is_public = 0, online_ok = 0 WHERE share_code = 'aaaaaaaaaa'").run()
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    addStrip(db, storageDir, 'cccccccccc', true, '2026-10-18 11:00:00')
    fail('strips/bbbbbbbbbb.png', Infinity)
    await expect(sync()).rejects.toThrow('network down')
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/cccccccccc.png'])
    expect(galleryIndex(files)).toEqual({ strips: [{ code: 'cccccccccc', createdAt: '2026-10-18 11:00:00' }] })
  })

  it('sends nothing when the bucket already matches', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, writes } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket)
    await sync()
    writes.length = 0
    expect(await sync()).toEqual({ uploaded: 0, removed: 0 })
    expect(writes).toEqual([])
  })

  it('removes a strip that was unshared or deleted, before uploading new ones', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    const { bucket, files, writes } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket)
    await sync()

    db.prepare("UPDATE strips SET is_public = 0 WHERE share_code = 'aaaaaaaaaa'").run()
    db.prepare("DELETE FROM sessions WHERE id = (SELECT session_id FROM strips WHERE share_code = 'bbbbbbbbbb')").run()
    addStrip(db, storageDir, 'cccccccccc', true, '2026-10-18 11:00:00')
    writes.length = 0
    expect(await sync()).toEqual({ uploaded: 1, removed: 2 })
    expect(writes.slice(0, 2).sort()).toEqual(['remove strips/aaaaaaaaaa.png', 'remove strips/bbbbbbbbbb.png'])
    expect(writes.slice(2)).toEqual(['upload strips/cccccccccc.png', 'upload gallery.json'])
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/cccccccccc.png'])
  })

  it('takes everything down when the admin turns the gallery off', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, files } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket)
    await sync()

    db.prepare("UPDATE settings SET value = 'false' WHERE key = 'gallery_enabled'").run()
    expect(await sync()).toEqual({ uploaded: 0, removed: 1 })
    expect(galleryIndex(files)).toEqual({ strips: [] })
  })

  it('rewrites the index on the next run when its upload failed', async () => {
    const { db, storageDir } = booth()
    const { bucket, files, fail } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket)
    await sync()

    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    fail('gallery.json', 1)
    await expect(sync()).rejects.toThrow('network down')
    expect(galleryIndex(files)).toEqual({ strips: [] })

    expect(await sync()).toEqual({ uploaded: 0, removed: 0 })
    expect(galleryIndex(files)).toEqual({ strips: [{ code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' }] })
  })

  it('leaves files outside strips/ alone', async () => {
    const { db, storageDir } = booth()
    const { bucket, files } = fakeBucket()
    await bucket.upload('site/index.html', Buffer.from('<p>'), { contentType: 'text/html', cacheControl: 'no-cache' })
    await cloudGallerySync(db, storageDir, bucket)()
    expect(files.has('site/index.html')).toBe(true)
  })

  it('skips a shared strip whose file is missing instead of getting stuck', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    rmSync(join(storageDir, 'strips', 'aaaaaaaaaa.png'))
    const { bucket, files } = fakeBucket()

    expect(await cloudGallerySync(db, storageDir, bucket)()).toEqual({ uploaded: 1, removed: 0 })
    expect(galleryIndex(files)).toEqual({ strips: [{ code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' }] })
  })

  it('writes the index on the first run even with nothing shared', async () => {
    const { db, storageDir } = booth()
    const { bucket, files } = fakeBucket()
    await cloudGallerySync(db, storageDir, bucket)()
    expect(galleryIndex(files)).toEqual({ strips: [] })
  })
})
