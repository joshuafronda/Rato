import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Writable } from 'node:stream'
import { ZipFile } from 'yazl'
import { photosForDownload, stripDays, stripsForDownload } from '../db/admin-queries.ts'
import type { Database } from '../db/connection.ts'
import { RequestError } from './request-error.ts'

export interface DownloadFile {
  /** Where the file is on the laptop. */
  source: string
  /** Its path inside the zip, e.g. 2026-10-18/strips/14-05-33-abcdefghjk.png */
  name: string
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function downloadDays(db: Database): Array<{ day: string; strips: number }> {
  return stripDays(db)
}

// '' or undefined = every day; otherwise a 'YYYY-MM-DD' date.
export function parseDay(value: unknown): string | null {
  if (value === undefined || value === '') return null
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) throw new RequestError(400, 'Choose a day as YYYY-MM-DD')
  return value
}

// The files for one day (or every day): the strips, and the original shots if asked.
// Files missing from disk are left out instead of breaking the download.
export function downloadFiles(db: Database, storageDir: string, day: string | null, withPhotos: boolean): DownloadFile[] {
  const files: DownloadFile[] = stripsForDownload(db, day).map((strip) => ({
    source: join(storageDir, 'strips', strip.image_path),
    name: `${strip.day}/strips/${strip.time}-${strip.share_code}.png`,
  }))
  if (withPhotos) {
    for (const photo of photosForDownload(db, day)) {
      files.push({
        source: join(storageDir, 'photos', photo.image_path),
        name: `${photo.day}/photos/${photo.time}-${photo.share_code}-shot${photo.shot_number}${extname(photo.image_path)}`,
      })
    }
  }
  return files.filter((file) => existsSync(file.source))
}

export function downloadName(day: string | null, withPhotos: boolean): string {
  return `rato-${day ?? 'all-days'}${withPhotos ? '-with-photos' : ''}.zip`
}

// Streams the files as a zip without loading them into memory. The images are already
// compressed (PNG, JPEG), so they are stored as they are, which keeps it fast.
export function writeZip(files: DownloadFile[], output: Writable, onError: (error: Error) => void): void {
  const zip = new ZipFile()
  zip.on('error', onError)
  zip.outputStream.pipe(output)
  for (const file of files) zip.addFile(file.source, file.name, { compress: false })
  zip.end()
}
