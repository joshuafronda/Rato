import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Database } from '../db/connection.ts'
import { listAllStrips } from '../db/strip-queries.ts'
import { galleryEnabled } from './sharing.ts'

// The online copy of the gallery (Firebase Storage). Every finished strip and an index go up,
// and a strip deleted on the laptop comes down; the raw shots never leave the laptop. Several
// booths can share one bucket: each keeps its strips in strips/<booth>/ and only ever touches
// its own folder and its own entries in the shared index.
export interface CloudBucket {
  list(prefix: string): Promise<string[]>
  read(path: string): Promise<{ data: Buffer; generation: string } | undefined>
  // ifGeneration: write only if the file is still at this version ('0' = must not exist yet).
  // A refused write throws an error with code 412.
  upload(
    path: string,
    data: Buffer,
    options: { contentType: string; cacheControl: string; ifGeneration?: string },
  ): Promise<void>
  remove(path: string): Promise<void>
}

interface IndexEntry {
  booth: string
  code: string
  createdAt: string
}

const STRIPS_PREFIX = 'strips/'
const INDEX_PATH = 'gallery.json'
// Short and private, so a deleted strip stops being served from caches within the hour.
const STRIP_CACHE = 'private, max-age=3600'
const INDEX_CACHE = 'no-cache'
// Each try loses only to another booth writing at that very moment.
const INDEX_TRIES = 5

// Returns a sync that makes this booth's folder match the laptop's strips: removes what was
// deleted first (so a failing upload never delays a take-down), uploads what is missing, then
// corrects this booth's entries in the shared index - listing only strips that are really
// online - whenever the index says otherwise. A failed upload is rethrown after the index is
// written, and the next run tries it again.
export function cloudGallerySync(
  db: Database,
  storageDir: string,
  bucket: CloudBucket,
  boothId: string,
): () => Promise<{ uploaded: number; removed: number }> {
  const folder = `${STRIPS_PREFIX}${boothId}/`
  const stripPath = (shareCode: string) => `${folder}${shareCode}.png`
  return async () => {
    // A strip whose file is gone is left out, so one missing file cannot block the rest.
    // The admin's gallery switch also takes this booth's strips down.
    const saved = galleryEnabled(db) ? listAllStrips(db) : []
    const strips = saved.filter((strip) => existsSync(join(storageDir, 'strips', strip.image_path)))
    const wanted = new Map(strips.map((strip) => [stripPath(strip.share_code), strip.image_path]))
    const online = new Set(await bucket.list(folder))

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
    const entries = listed.map((strip) => ({ booth: boothId, code: strip.share_code, createdAt: strip.created_at }))
    await writeOwnEntries(bucket, boothId, entries)
    if (firstError !== undefined) throw firstError
    return { uploaded, removed }
  }
}

// Replaces this booth's entries in the shared index, keeping every other booth's, unless the
// index already lists exactly these. The write only lands if nobody changed the index since it
// was read; otherwise it reads and tries again.
async function writeOwnEntries(bucket: CloudBucket, boothId: string, entries: IndexEntry[]): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    const current = await bucket.read(INDEX_PATH)
    const listedNow = readEntries(current?.data)
    const mine = listedNow.filter((entry) => entry.booth === boothId)
    if (current && sameStrips(mine, entries)) return
    const others = listedNow.filter((entry) => entry.booth !== boothId)
    const strips = [...others, ...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    try {
      await bucket.upload(INDEX_PATH, Buffer.from(JSON.stringify({ strips })), {
        contentType: 'application/json',
        cacheControl: INDEX_CACHE,
        ifGeneration: current?.generation ?? '0',
      })
      return
    } catch (error) {
      if (!isConflict(error) || attempt === INDEX_TRIES) throw error
    }
  }
}

// The entries of an index file, skipping anything malformed rather than failing the sync.
function readEntries(data: Buffer | undefined): IndexEntry[] {
  if (!data) return []
  try {
    const parsed: unknown = JSON.parse(String(data))
    const strips = (parsed as { strips?: unknown }).strips
    if (!Array.isArray(strips)) return []
    return strips.filter(
      (entry): entry is IndexEntry =>
        typeof entry?.booth === 'string' && typeof entry?.code === 'string' && typeof entry?.createdAt === 'string',
    )
  } catch {
    return []
  }
}

function sameStrips(a: IndexEntry[], b: IndexEntry[]): boolean {
  const key = (entries: IndexEntry[]) => JSON.stringify(entries.map((entry) => `${entry.code} ${entry.createdAt}`).sort())
  return key(a) === key(b)
}

function isConflict(error: unknown): boolean {
  return (error as { code?: unknown })?.code === 412
}

// Wraps a task so calls never overlap: a call while it runs asks for one more run right after,
// so a strip saved mid-sync goes up straight away instead of waiting for the next timer.
export function coalescedRunner(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | undefined
  let again = false
  const run = (): Promise<void> => {
    if (running) {
      again = true
      return running
    }
    running = task().finally(() => {
      running = undefined
      if (!again) return
      again = false
      // The task reports its own failures; this follow-up run has no caller to tell.
      run().catch(() => {})
    })
    return running
  }
  return run
}
