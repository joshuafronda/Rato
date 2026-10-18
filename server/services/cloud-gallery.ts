import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Database } from '../db/connection.ts'
import { listAllPublicStrips } from '../db/strip-queries.ts'
import { galleryEnabled } from './sharing.ts'

// The online copy of the gallery (Firebase Storage). Only the shared strips and an index go
// up; raw photos and private strips never leave the laptop.
export interface CloudBucket {
  list(prefix: string): Promise<string[]>
  upload(path: string, data: Buffer, options: { contentType: string; cacheControl: string }): Promise<void>
  remove(path: string): Promise<void>
}

const STRIPS_PREFIX = 'strips/'
const INDEX_PATH = 'gallery.json'
// A strip never changes once saved; the index changes whenever a guest shares one.
const STRIP_CACHE = 'public, max-age=31536000, immutable'
const INDEX_CACHE = 'no-cache'

// Makes the bucket match the shared strips: uploads what is missing, removes what was unshared
// or deleted, then rewrites the index if anything changed. Safe to run again after a failure.
export async function syncCloudGallery(
  db: Database,
  storageDir: string,
  bucket: CloudBucket,
): Promise<{ uploaded: number; removed: number }> {
  // A strip whose file is gone is left out, so one missing file cannot block the rest.
  const shared = galleryEnabled(db) ? listAllPublicStrips(db) : []
  const strips = shared.filter((strip) => existsSync(join(storageDir, 'strips', strip.image_path)))
  const wanted = new Map(strips.map((strip) => [`${STRIPS_PREFIX}${strip.share_code}.png`, strip.image_path]))
  const online = new Set(await bucket.list(''))

  let uploaded = 0
  for (const [path, imagePath] of wanted) {
    if (online.has(path)) continue
    const data = readFileSync(join(storageDir, 'strips', imagePath))
    await bucket.upload(path, data, { contentType: 'image/png', cacheControl: STRIP_CACHE })
    uploaded += 1
  }

  let removed = 0
  for (const path of online) {
    if (!path.startsWith(STRIPS_PREFIX) || wanted.has(path)) continue
    await bucket.remove(path)
    removed += 1
  }

  if (uploaded > 0 || removed > 0 || !online.has(INDEX_PATH)) {
    const index = { strips: strips.map((strip) => ({ code: strip.share_code, createdAt: strip.created_at })) }
    await bucket.upload(INDEX_PATH, Buffer.from(JSON.stringify(index)), {
      contentType: 'application/json',
      cacheControl: INDEX_CACHE,
    })
  }
  return { uploaded, removed }
}
