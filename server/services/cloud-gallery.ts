import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Database } from '../db/connection.ts'
import { listOnlineStrips } from '../db/strip-queries.ts'
import { galleryEnabled } from './sharing.ts'

// The online copy of the gallery (Firebase Storage). Only strips a guest shared to the online
// gallery and an index go up; raw photos and private strips never leave the laptop.
export interface CloudBucket {
  list(prefix: string): Promise<string[]>
  upload(path: string, data: Buffer, options: { contentType: string; cacheControl: string }): Promise<void>
  remove(path: string): Promise<void>
}

const STRIPS_PREFIX = 'strips/'
const INDEX_PATH = 'gallery.json'
// Short and private, so a strip a guest unshares stops being served from caches within the hour.
const STRIP_CACHE = 'private, max-age=3600'
const INDEX_CACHE = 'no-cache'

// Returns a sync that makes the bucket match the shared strips: removes what was unshared or
// deleted first (so a failing upload never delays a take-down), uploads what is missing, then
// rewrites the index - listing only strips that are really online - whenever it differs from
// the last one written. A failed upload is rethrown after the index is written, and the next
// run tries it again.
export function cloudGallerySync(
  db: Database,
  storageDir: string,
  bucket: CloudBucket,
): () => Promise<{ uploaded: number; removed: number }> {
  let lastIndex = ''
  return async () => {
    // A strip whose file is gone is left out, so one missing file cannot block the rest.
    const shared = galleryEnabled(db) ? listOnlineStrips(db) : []
    const strips = shared.filter((strip) => existsSync(join(storageDir, 'strips', strip.image_path)))
    const wanted = new Map(strips.map((strip) => [stripPath(strip.share_code), strip.image_path]))
    const online = new Set(await bucket.list(STRIPS_PREFIX))

    let removed = 0
    for (const path of online) {
      if (wanted.has(path)) continue
      await bucket.remove(path)
      online.delete(path)
      removed += 1
    }

    let uploaded = 0
    let firstError: unknown
    for (const [path, imagePath] of wanted) {
      if (online.has(path)) continue
      try {
        const data = await readFile(join(storageDir, 'strips', imagePath))
        await bucket.upload(path, data, { contentType: 'image/png', cacheControl: STRIP_CACHE })
        online.add(path)
        uploaded += 1
      } catch (error) {
        firstError ??= error
      }
    }

    const listed = strips.filter((strip) => online.has(stripPath(strip.share_code)))
    const index = JSON.stringify({ strips: listed.map((strip) => ({ code: strip.share_code, createdAt: strip.created_at })) })
    if (index !== lastIndex) {
      await bucket.upload(INDEX_PATH, Buffer.from(index), { contentType: 'application/json', cacheControl: INDEX_CACHE })
      lastIndex = index
    }
    if (firstError !== undefined) throw firstError
    return { uploaded, removed }
  }
}

function stripPath(shareCode: string): string {
  return `${STRIPS_PREFIX}${shareCode}.png`
}
