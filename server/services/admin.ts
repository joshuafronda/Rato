import { randomBytes } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  busiestHours,
  countFramesUsingImage,
  deleteFrameRow,
  findFrameImage,
  findFilter,
  findPrintJob,
  findStripById,
  frameIdsForLayout,
  insertFrame,
  listAllFilters,
  listAllFrames,
  listAllLayouts,
  listPrintJobs,
  listStripsOnDay,
  mostUsedFrame,
  readStats,
  setDefaultFilter,
  setFilterActive,
  setFrameOrder,
  setLayoutActive,
  setStripPublicById,
  type FrameChanges,
  updateFrame,
} from '../db/admin-queries.ts'
import { insertPrintJob } from '../db/strip-queries.ts'
import type { Database } from '../db/connection.ts'
import { type Slot, toFrame } from './catalog.ts'
import { removeSession } from './cleanup.ts'
import { RequestError } from './request-error.ts'
import { stripImageUrl } from './strips.ts'

const PEAK_HOURS = 3
const STRIP_PAGE = 50
const PRINT_JOB_LIMIT = 100

export function overview(db: Database) {
  const stats = readStats(db)
  return {
    sessionsToday: stats.sessions_today,
    totalStrips: stats.total_strips,
    totalPrints: stats.total_prints,
    peakHours: busiestHours(db, PEAK_HOURS),
    mostUsedFrame: mostUsedFrame(db) ?? null,
  }
}

export function adminLayouts(db: Database) {
  return listAllLayouts(db).map((row) => ({ ...row, active: row.active === 1 }))
}

export function changeLayout(db: Database, id: number, active: boolean): void {
  if (!setLayoutActive(db, id, active)) throw new RequestError(404, 'Layout not found')
}

export function adminFrames(db: Database) {
  return listAllFrames(db).map((row) => ({ ...toFrame(row), active: row.active === 1, sortOrder: row.sort_order }))
}

export interface FrameUpload {
  layoutId: number
  name: string
  image: Buffer
  /** Photo windows found in the PNG, or null to use the layout's standard holes. */
  slots: unknown
  showText: boolean
}

const STRIP_WIDTH = 600
const STRIP_HEIGHT = 1800
const MIN_WINDOW = 50

// A new frame: a PNG with see-through holes for the shots, in the strip's 1:3 shape
// (600 x 1800 is exact). SVG is refused: it can carry scripts.
export function uploadFrame(db: Database, storageDir: string, upload: FrameUpload): number {
  const { layoutId, image } = upload
  const cleanName = upload.name.trim()
  if (cleanName.length < 1 || cleanName.length > 40) throw new RequestError(400, 'Give the frame a name of 1 to 40 characters')
  const layout = adminLayouts(db).find((candidate) => candidate.id === layoutId)
  if (!layout) throw new RequestError(400, 'Choose a layout for the frame')
  const slots = upload.slots === null ? null : photoWindows(upload.slots, layout.shots)
  const size = pngSize(image)
  if (!size) throw new RequestError(415, 'Upload the frame as a PNG image')
  if (Math.abs(size.height / size.width - 3) > 0.03) {
    throw new RequestError(400, `The frame must be 1:3 like the strip (600 x 1800), not ${size.width} x ${size.height}`)
  }
  const fileName = `frame-${randomBytes(8).toString('hex')}.png`
  const path = join(storageDir, 'frames', fileName)
  writeFileSync(path, image)
  try {
    const savedSlots = slots === null ? null : JSON.stringify(slots)
    return insertFrame(db, { layoutId, name: cleanName, imagePath: fileName, slots: savedSlots, showText: upload.showText })
  } catch (error) {
    rmSync(path, { force: true })
    throw error
  }
}

export function changeFrame(db: Database, id: number, changes: FrameChanges): void {
  if (changes.name !== undefined && (changes.name.trim().length < 1 || changes.name.trim().length > 40)) {
    throw new RequestError(400, 'Give the frame a name of 1 to 40 characters')
  }
  if (!updateFrame(db, id, { ...changes, name: changes.name?.trim() })) throw new RequestError(404, 'Frame not found')
}

// Deletes a frame and, once no other frame uses it, its image file. Strips already made
// with it are finished images and stay as they are.
export function deleteFrame(db: Database, storageDir: string, id: number): void {
  const imagePath = findFrameImage(db, id)
  if (imagePath === undefined) throw new RequestError(404, 'Frame not found')
  deleteFrameRow(db, id)
  if (countFramesUsingImage(db, imagePath) === 0) rmSync(join(storageDir, 'frames', imagePath), { force: true })
}

// The new order of every frame of one layout, first to last.
export function reorderFrames(db: Database, layoutId: number, ids: number[]): void {
  const existing = frameIdsForLayout(db, layoutId)
  const sameSet = ids.length === existing.length && new Set(ids).size === ids.length && ids.every((id) => existing.includes(id))
  if (!sameSet) throw new RequestError(400, 'Send every frame of the layout exactly once')
  setFrameOrder(db, ids)
}

export function adminFilters(db: Database) {
  return listAllFilters(db).map((row) => ({
    id: row.id,
    name: row.name,
    active: row.active === 1,
    isDefault: row.is_default === 1,
  }))
}

export function changeFilter(db: Database, id: number, active: boolean): void {
  const filter = findFilter(db, id)
  if (!filter) throw new RequestError(404, 'Filter not found')
  if (!active && filter.is_default === 1) throw new RequestError(400, 'Choose another default filter before turning this one off')
  setFilterActive(db, id, active)
}

export function makeDefaultFilter(db: Database, id: number): void {
  if (!findFilter(db, id)) throw new RequestError(404, 'Filter not found')
  setDefaultFilter(db, id)
}

// One page of strips, newest first, from one day or (day = null) every day.
export function adminStrips(db: Database, page: number, day: string | null = null) {
  return listStripsOnDay(db, day, STRIP_PAGE, page * STRIP_PAGE).map((row) => ({
    id: row.id,
    shareCode: row.share_code,
    imageUrl: stripImageUrl(row.share_code),
    isPublic: row.is_public === 1,
    printCount: row.print_count,
    createdAt: row.created_at,
  }))
}

export function changeStripVisibility(db: Database, id: number, isPublic: boolean): void {
  if (!setStripPublicById(db, id, isPublic)) throw new RequestError(404, 'Strip not found')
}

// Deletes the strip with its session, shots and print jobs, on disk too.
export function deleteStrip(db: Database, storageDir: string, id: number): void {
  const strip = findStripById(db, id)
  if (!strip) throw new RequestError(404, 'Strip not found')
  removeSession(db, storageDir, strip.session_id)
}

export function printJobs(db: Database) {
  return listPrintJobs(db, PRINT_JOB_LIMIT).map((row) => ({
    id: row.id,
    copies: row.copies,
    status: row.status,
    createdAt: row.created_at,
    shareCode: row.share_code,
    imageUrl: stripImageUrl(row.share_code),
  }))
}

// A reprint is a new queued job with the same strip and copies; the booth prints it.
export function reprint(db: Database, id: number): number {
  const job = findPrintJob(db, id)
  if (!job) throw new RequestError(404, 'Print job not found')
  return insertPrintJob(db, job.strip_id, job.copies)
}

// The photo windows sent with a frame: one per shot, whole pixels, inside the strip.
function photoWindows(value: unknown, shots: number): Slot[] {
  if (!Array.isArray(value) || value.length !== shots) {
    throw new RequestError(400, `This layout takes ${shots} photos, so the frame needs ${shots} see-through windows`)
  }
  return value.map((window: unknown) => {
    const { x, y, width, height } = (typeof window === 'object' && window !== null ? window : {}) as Record<string, unknown>
    const numbers = [x, y, width, height]
    const valid =
      numbers.every((n) => Number.isInteger(n)) &&
      (x as number) >= 0 &&
      (y as number) >= 0 &&
      (width as number) >= MIN_WINDOW &&
      (height as number) >= MIN_WINDOW &&
      (x as number) + (width as number) <= STRIP_WIDTH &&
      (y as number) + (height as number) <= STRIP_HEIGHT
    if (!valid) throw new RequestError(400, 'A photo window is outside the strip or too small')
    return { x, y, width, height } as Slot
  })
}

// Width and height from a PNG's header, or null if it is not a PNG.
function pngSize(image: Buffer): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (image.length < 24 || !signature.every((byte, i) => image[i] === byte)) return null
  if (image.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
}
