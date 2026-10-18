import { createHash, randomBytes } from 'node:crypto'
import {
  countAdmins,
  deleteAdminSession,
  deleteExpiredAdminSessions,
  findAdminBySession,
  findAdminByUsername,
  insertAdmin,
  insertAdminSession,
} from '../db/admin-queries.ts'
import type { Database } from '../db/connection.ts'
import { hashPassword, verifyPassword } from './passwords.ts'
import { RequestError } from './request-error.ts'

const SESSION_HOURS = 12
export const MIN_PASSWORD_LENGTH = 8
const MAX_FAILURES = 5
const LOCKOUT_MS = 60_000

// A hash that verifies nothing, so an unknown username costs the same time as a wrong password.
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'))

export interface Admin {
  id: number
  username: string
}

export function setupNeeded(db: Database): boolean {
  return countAdmins(db) === 0
}

// Creates the one admin account. Only possible while there is none.
export function createFirstAdmin(db: Database, username: string, password: string): string {
  if (!setupNeeded(db)) throw new RequestError(409, 'The admin account already exists')
  const name = username.trim()
  if (name.length < 1 || name.length > 40) throw new RequestError(400, 'Choose a username of 1 to 40 characters')
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new RequestError(400, `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  const id = insertAdmin(db, name, hashPassword(password))
  return startSession(db, id)
}

// Returns a session token for the cookie. Repeated failures from one address lock it out
// for a minute, so the password cannot be guessed quickly from a phone on the Wi-Fi.
export function logIn(db: Database, limiter: LoginLimiter, address: string, username: string, password: string): string {
  if (limiter.isLocked(address)) throw new RequestError(429, 'Too many tries. Wait a minute, then try again.')
  const admin = findAdminByUsername(db, username.trim())
  const passwordMatches = verifyPassword(password, admin?.password_hash ?? DUMMY_HASH)
  if (!admin || !passwordMatches) {
    limiter.fail(address)
    throw new RequestError(401, 'Wrong username or password')
  }
  limiter.clear(address)
  return startSession(db, admin.id)
}

export function logOut(db: Database, token: string): void {
  deleteAdminSession(db, hashToken(token))
}

export function adminForToken(db: Database, token: string | undefined): Admin | undefined {
  if (!token) return undefined
  return findAdminBySession(db, hashToken(token))
}

function startSession(db: Database, adminId: number): string {
  deleteExpiredAdminSessions(db)
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000).toISOString().replace('T', ' ').slice(0, 19)
  insertAdminSession(db, adminId, hashToken(token), expiresAt)
  return token
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const SESSION_MAX_AGE_MS = SESSION_HOURS * 3_600_000

export class LoginLimiter {
  private readonly failures = new Map<string, { count: number; lockedUntil: number }>()
  private readonly now: () => number

  constructor(now: () => number = Date.now) {
    this.now = now
  }

  isLocked(address: string): boolean {
    const entry = this.failures.get(address)
    return entry !== undefined && entry.lockedUntil > this.now()
  }

  fail(address: string): void {
    const entry = this.failures.get(address) ?? { count: 0, lockedUntil: 0 }
    entry.count += 1
    if (entry.count >= MAX_FAILURES) {
      entry.count = 0
      entry.lockedUntil = this.now() + LOCKOUT_MS
    }
    this.failures.set(address, entry)
  }

  clear(address: string): void {
    this.failures.delete(address)
  }
}
