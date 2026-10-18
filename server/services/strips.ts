import { randomInt } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { findActiveFilter, findActiveFrame, findActiveLayout } from '../db/catalog-queries.ts'
import type { Database } from '../db/connection.ts'
import {
  countPhotos,
  findPhotoPath,
  findSession,
  findStripByCode,
  insertSession,
  insertStrip,
  type SessionRow,
  savePhoto,
} from '../db/strip-queries.ts'
import { withDpi } from './png-dpi.ts'
import { RequestError } from './request-error.ts'

export interface SessionChoices {
  layoutId: number
  frameId: number | null
  filterId: number
}

export interface SavedStrip {
  shareCode: string
  imageUrl: string
}

export interface Strip extends SavedStrip {
  createdAt: string
}

// No 0/o, 1/l/i: the code may be read off a screen and typed on a phone.
const SHARE_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const SHARE_CODE_LENGTH = 10
export const SHARE_CODE_PATTERN = /^[a-z2-9]{10}$/

// The 600 x 1800 strip is a 2 x 6 inch print at this resolution.
const STRIP_DPI = 300

type ImageType = 'jpg' | 'png'

export function createSession(db: Database, { layoutId, frameId, filterId }: SessionChoices): { id: number; shots: number } {
  const layout = findActiveLayout(db, layoutId)
  if (!layout) throw new RequestError(400, 'That layout is not available')
  if (frameId !== null && findActiveFrame(db, frameId)?.layout_id !== layoutId) {
    throw new RequestError(400, 'That frame is not available for this layout')
  }
  if (!findActiveFilter(db, filterId)) throw new RequestError(400, 'That filter is not available')
  return { id: insertSession(db, layoutId, frameId, filterId), shots: layout.shots }
}

// Saves one shot. A retake replaces the earlier file and row.
export function savePhotoFile(db: Database, storageDir: string, sessionId: number, shot: number, image: Buffer): void {
  const session = openSession(db, sessionId)
  if (shot < 1 || shot > session.shots) throw new RequestError(400, `This layout has ${session.shots} shots`)
  const type = imageType(image)
  if (!type) throw new RequestError(415, 'Send a JPEG or PNG image')

  const fileName = `${sessionId}-${shot}.${type}`
  const previous = findPhotoPath(db, sessionId, shot)
  writeFileSync(join(storageDir, 'photos', fileName), image)
  savePhoto(db, sessionId, shot, fileName)
  if (previous && previous !== fileName) rmSync(join(storageDir, 'photos', previous), { force: true })
}

// Saves the composed strip, private until the guest chooses to share it. The file is marked
// 300 dpi, so a downloaded strip opens and prints at 2 x 6 inches.
export function saveStripFile(db: Database, storageDir: string, sessionId: number, image: Buffer): SavedStrip {
  const session = openSession(db, sessionId)
  if (countPhotos(db, sessionId) < session.shots) throw new RequestError(409, 'Upload every shot first')
  if (imageType(image) !== 'png') throw new RequestError(415, 'Send the strip as a PNG image')

  const shareCode = newShareCode()
  const fileName = `${shareCode}.png`
  const filePath = join(storageDir, 'strips', fileName)
  writeFileSync(filePath, withDpi(image, STRIP_DPI))
  try {
    insertStrip(db, sessionId, fileName, shareCode)
  } catch (error) {
    rmSync(filePath, { force: true })
    throw error
  }
  return { shareCode, imageUrl: stripImageUrl(shareCode) }
}

export function findStrip(db: Database, shareCode: string): Strip | undefined {
  if (!SHARE_CODE_PATTERN.test(shareCode)) return undefined
  const row = findStripByCode(db, shareCode)
  if (!row) return undefined
  return { shareCode: row.share_code, imageUrl: stripImageUrl(row.share_code), createdAt: row.created_at }
}

// The strip's file on disk. Undefined for an unknown code.
export function stripImagePath(db: Database, storageDir: string, shareCode: string): string | undefined {
  if (!SHARE_CODE_PATTERN.test(shareCode)) return undefined
  const row = findStripByCode(db, shareCode)
  return row ? join(storageDir, 'strips', row.image_path) : undefined
}

function openSession(db: Database, sessionId: number): SessionRow {
  const session = findSession(db, sessionId)
  if (!session) throw new RequestError(404, 'Session not found')
  if (session.has_strip) throw new RequestError(409, 'This strip is already finished')
  return session
}

export function stripImageUrl(shareCode: string): string {
  return `/api/strips/${shareCode}/image`
}

// About 8 x 10^14 codes, so guessing one from a phone on the Wi-Fi is not practical.
function newShareCode(): string {
  let code = ''
  for (let i = 0; i < SHARE_CODE_LENGTH; i += 1) code += SHARE_CODE_ALPHABET[randomInt(SHARE_CODE_ALPHABET.length)]
  return code
}

// Reads the file signature rather than trusting the Content-Type header.
function imageType(image: Buffer): ImageType | null {
  if (image.length > 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) return 'jpg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (image.length > png.length && png.every((byte, i) => image[i] === byte)) return 'png'
  return null
}
