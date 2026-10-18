import type { Database } from '../db/connection.ts'
import { claimNextPrintJob, finishPrintJob, findStripId, insertPrintJob } from '../db/strip-queries.ts'
import { RequestError } from './request-error.ts'
import { SHARE_CODE_PATTERN, stripImageUrl } from './strips.ts'

export interface PrintJob {
  id: number
  copies: number
  imageUrl: string
}

export const MAX_COPIES = 3

// Every print - a guest's or an admin's reprint - is a queued job. The booth screen claims
// and prints the jobs, so there is one way a strip reaches the printer.
export function queuePrint(db: Database, shareCode: string, copies: number): number {
  if (!Number.isInteger(copies) || copies < 1 || copies > MAX_COPIES) {
    throw new RequestError(400, `Choose 1 to ${MAX_COPIES} copies`)
  }
  const stripId = SHARE_CODE_PATTERN.test(shareCode) ? findStripId(db, shareCode) : undefined
  if (stripId === undefined) throw new RequestError(404, 'Strip not found')
  return insertPrintJob(db, stripId, copies)
}

export function claimPrintJob(db: Database): PrintJob | null {
  const row = claimNextPrintJob(db)
  if (!row) return null
  return { id: row.id, copies: row.copies, imageUrl: stripImageUrl(row.share_code) }
}

export function finishPrint(db: Database, id: number, printed: boolean): void {
  if (!finishPrintJob(db, id, printed)) throw new RequestError(404, 'No print job is printing with that id')
}
