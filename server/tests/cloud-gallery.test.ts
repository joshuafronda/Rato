import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Database } from '../db/connection.ts'
import { type CloudBucket, cloudGallerySync, coalescedRunner } from '../services/cloud-gallery.ts'
import { migratedDb, tempDir } from './helpers.ts'

interface StoredFile {
  data: Buffer
  contentType: string
  cacheControl: string
  generation: number
}

// Stands in for Firebase Storage: online paths with a version number each, so a write that
// expects an older version is refused like the real bucket does. Logs every write.
function fakeBucket() {
  const files = new Map<string, StoredFile>()
  const writes: string[] = []
  const failing = new Map<string, number>()
  let version = 0
  let beforeNextIndexWrite: (() => void) | undefined
  const bucket: CloudBucket = {
    list: async (prefix) => [...files.keys()].filter((path) => path.startsWith(prefix)),
    read: async (path) => {
      const file = files.get(path)
      return file ? { data: file.data, generation: String(file.generation) } : undefined
    },
    upload: async (path, data, { contentType, cacheControl, ifGeneration }) => {
      const failuresLeft = failing.get(path) ?? 0
      if (failuresLeft > 0) {
        failing.set(path, failuresLeft - 1)
        throw new Error('network down')
      }
      if (path === 'gallery.json' && beforeNextIndexWrite) {
        const otherWriter = beforeNextIndexWrite
        beforeNextIndexWrite = undefined
        otherWriter()
      }
      if (ifGeneration !== undefined && ifGeneration !== String(files.get(path)?.generation ?? 0)) {
        throw Object.assign(new Error('precondition failed'), { code: 412 })
      }
      writes.push(`upload ${path}`)
      version += 1
      files.set(path, { data, contentType, cacheControl, generation: version })
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
    // Another booth rewrites the index between this booth's read and its write.
    raceNextIndexWrite: (index: unknown) => {
      beforeNextIndexWrite = () => {
        version += 1
        files.set('gallery.json', {
          data: Buffer.from(JSON.stringify(index)),
          contentType: 'application/json',
          cacheControl: 'no-cache',
          generation: version,
        })
      }
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

// The way admin delete and auto-delete remove a guest: the session, which cascades to the strip.
function deleteStrip(db: Database, code: string): void {
  db.prepare('DELETE FROM sessions WHERE id = (SELECT session_id FROM strips WHERE share_code = ?)').run(code)
}

function galleryIndex(files: Map<string, StoredFile>): unknown {
  return JSON.parse(String(files.get('gallery.json')?.data))
}

describe('cloud gallery sync', () => {
  it('uploads every finished strip into its booth folder, with a newest-first index', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', false, '2026-10-18 10:00:00')
    const { bucket, files } = fakeBucket()

    expect(await cloudGallerySync(db, storageDir, bucket, 'hall')()).toEqual({ uploaded: 2, removed: 0 })
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/hall/aaaaaaaaaa.png', 'strips/hall/bbbbbbbbbb.png'])
    expect(files.get('strips/hall/aaaaaaaaaa.png')).toMatchObject({
      data: Buffer.from('png-aaaaaaaaaa'),
      contentType: 'image/png',
      cacheControl: 'private, max-age=3600',
    })
    expect(files.get('gallery.json')?.cacheControl).toBe('no-cache')
    expect(galleryIndex(files)).toEqual({
      strips: [
        { booth: 'hall', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
        { booth: 'hall', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
      ],
    })
  })

  it('lets two booths share one gallery without touching each other', async () => {
    const hall = booth()
    const lobby = booth()
    addStrip(hall.db, hall.storageDir, 'aaaaaaaaaa', false, '2026-10-18 09:00:00')
    addStrip(lobby.db, lobby.storageDir, 'bbbbbbbbbb', false, '2026-10-18 10:00:00')
    const { bucket, files } = fakeBucket()
    const syncHall = cloudGallerySync(hall.db, hall.storageDir, bucket, 'hall')
    const syncLobby = cloudGallerySync(lobby.db, lobby.storageDir, bucket, 'lobby')
    await syncHall()
    await syncLobby()
    // A second round changes nothing: neither booth removes the other's strip.
    expect(await syncHall()).toEqual({ uploaded: 0, removed: 0 })
    expect(await syncLobby()).toEqual({ uploaded: 0, removed: 0 })
    expect(galleryIndex(files)).toEqual({
      strips: [
        { booth: 'lobby', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
        { booth: 'hall', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
      ],
    })

    deleteStrip(hall.db, 'aaaaaaaaaa')
    expect(await syncHall()).toEqual({ uploaded: 0, removed: 1 })
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/lobby/bbbbbbbbbb.png'])
    expect(galleryIndex(files)).toEqual({ strips: [{ booth: 'lobby', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' }] })
  })

  it('keeps the other booth entry when both write the index at the same moment', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', false, '2026-10-18 09:00:00')
    const { bucket, files, writes, raceNextIndexWrite } = fakeBucket()
    raceNextIndexWrite({ strips: [{ booth: 'lobby', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' }] })

    await cloudGallerySync(db, storageDir, bucket, 'hall')()
    expect(writes.filter((write) => write === 'upload gallery.json')).toHaveLength(1)
    expect(galleryIndex(files)).toEqual({
      strips: [
        { booth: 'lobby', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
        { booth: 'hall', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
      ],
    })
  })

  it('still drops a deleted strip from the index while another upload keeps failing', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, files, fail } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()

    deleteStrip(db, 'aaaaaaaaaa')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    addStrip(db, storageDir, 'cccccccccc', true, '2026-10-18 11:00:00')
    fail('strips/hall/bbbbbbbbbb.png', Infinity)
    await expect(sync()).rejects.toThrow('network down')
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/hall/cccccccccc.png'])
    expect(galleryIndex(files)).toEqual({ strips: [{ booth: 'hall', code: 'cccccccccc', createdAt: '2026-10-18 11:00:00' }] })
  })

  it('clears entries under its booth name that it does not have, like ones left by a test run', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, files } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()

    const stale = { strips: [{ booth: 'hall', code: 'zzzzzzzzzz', createdAt: '2026-10-18 08:00:00' }] }
    await bucket.upload('gallery.json', Buffer.from(JSON.stringify(stale)), { contentType: 'application/json', cacheControl: 'no-cache' })
    await sync()
    expect(galleryIndex(files)).toEqual({ strips: [{ booth: 'hall', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' }] })
  })

  it('sends nothing when the bucket already matches', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, writes } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()
    writes.length = 0
    expect(await sync()).toEqual({ uploaded: 0, removed: 0 })
    expect(writes).toEqual([])
  })

  it('removes deleted strips before uploading new ones', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    const { bucket, files, writes } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()

    deleteStrip(db, 'aaaaaaaaaa')
    deleteStrip(db, 'bbbbbbbbbb')
    addStrip(db, storageDir, 'cccccccccc', false, '2026-10-18 11:00:00')
    writes.length = 0
    expect(await sync()).toEqual({ uploaded: 1, removed: 2 })
    expect(writes.slice(0, 2).sort()).toEqual(['remove strips/hall/aaaaaaaaaa.png', 'remove strips/hall/bbbbbbbbbb.png'])
    expect(writes.slice(2)).toEqual(['upload strips/hall/cccccccccc.png', 'upload gallery.json'])
    expect([...files.keys()].sort()).toEqual(['gallery.json', 'strips/hall/cccccccccc.png'])
  })

  it("takes this booth's strips down when the admin turns the gallery off", async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    const { bucket, files } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()

    db.prepare("UPDATE settings SET value = 'false' WHERE key = 'gallery_enabled'").run()
    expect(await sync()).toEqual({ uploaded: 0, removed: 1 })
    expect(galleryIndex(files)).toEqual({ strips: [] })
  })

  it('rewrites the index on the next run when its upload failed', async () => {
    const { db, storageDir } = booth()
    const { bucket, files, fail } = fakeBucket()
    const sync = cloudGallerySync(db, storageDir, bucket, 'hall')
    await sync()

    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    fail('gallery.json', 1)
    await expect(sync()).rejects.toThrow('network down')
    expect(galleryIndex(files)).toEqual({ strips: [] })

    expect(await sync()).toEqual({ uploaded: 0, removed: 0 })
    expect(galleryIndex(files)).toEqual({ strips: [{ booth: 'hall', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' }] })
  })

  it('leaves files outside its booth folder alone', async () => {
    const { db, storageDir } = booth()
    const { bucket, files } = fakeBucket()
    await bucket.upload('site/index.html', Buffer.from('<p>'), { contentType: 'text/html', cacheControl: 'no-cache' })
    await bucket.upload('strips/lobby/bbbbbbbbbb.png', Buffer.from('png'), { contentType: 'image/png', cacheControl: 'no-cache' })
    await cloudGallerySync(db, storageDir, bucket, 'hall')()
    expect(files.has('site/index.html')).toBe(true)
    expect(files.has('strips/lobby/bbbbbbbbbb.png')).toBe(true)
  })

  it('skips a strip whose file is missing instead of getting stuck', async () => {
    const { db, storageDir } = booth()
    addStrip(db, storageDir, 'aaaaaaaaaa', true, '2026-10-18 09:00:00')
    addStrip(db, storageDir, 'bbbbbbbbbb', true, '2026-10-18 10:00:00')
    rmSync(join(storageDir, 'strips', 'aaaaaaaaaa.png'))
    const { bucket, files } = fakeBucket()

    expect(await cloudGallerySync(db, storageDir, bucket, 'hall')()).toEqual({ uploaded: 1, removed: 0 })
    expect(galleryIndex(files)).toEqual({ strips: [{ booth: 'hall', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' }] })
  })

  it('writes the index on the first run even with nothing saved', async () => {
    const { db, storageDir } = booth()
    const { bucket, files } = fakeBucket()
    await cloudGallerySync(db, storageDir, bucket, 'hall')()
    expect(galleryIndex(files)).toEqual({ strips: [] })
  })
})

describe('coalesced runner', () => {
  it('runs again right after the current run when asked mid-run, but only once', async () => {
    let runs = 0
    let finish = () => {}
    const run = coalescedRunner(
      () =>
        new Promise<void>((resolve) => {
          runs += 1
          finish = resolve
        }),
    )
    const first = run()
    void run()
    void run()
    expect(runs).toBe(1)
    finish()
    await first
    await Promise.resolve()
    expect(runs).toBe(2)
    finish()
  })

  it('keeps working after a run fails', async () => {
    let runs = 0
    const run = coalescedRunner(async () => {
      runs += 1
      if (runs === 1) throw new Error('offline')
    })
    await expect(run()).rejects.toThrow('offline')
    await run()
    expect(runs).toBe(2)
  })
})
