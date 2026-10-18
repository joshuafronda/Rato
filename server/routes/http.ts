import type { Response } from 'express'

// One shape for every client error the routes send.
export function badRequest(res: Response, message: string, status = 400): void {
  res.status(status).json({ error: message })
}

// A route parameter or query value that must be a positive whole number. Null if it is not.
export function positiveInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}
