import { readAllSettings, writeSettings } from '../db/admin-queries.ts'
import type { Database } from '../db/connection.ts'
import { RequestError } from './request-error.ts'

export interface Settings {
  countdownSeconds: number
  captionText: string
  dateFormat: string
  printer: string
  printPaper: '4x6' | '2x6'
  galleryEnabled: boolean
  autoDeleteDays: number
}

type Field = {
  key: string
  read: (value: string | undefined) => unknown
  write: (value: unknown) => string
}

// Each admin setting: its database key, how it is read, and the rule for a new value.
const FIELDS: Record<keyof Settings, Field> = {
  countdownSeconds: {
    key: 'countdown_seconds',
    read: (value) => Number(value ?? 3),
    write: (value) => wholeNumber(value, 1, 10, 'The countdown must be 1 to 10 seconds'),
  },
  captionText: { key: 'caption_text', read: (value) => value ?? '', write: (value) => text(value, 40, 'caption') },
  dateFormat: { key: 'date_format', read: (value) => value ?? '', write: (value) => text(value, 30, 'date format') },
  printer: { key: 'printer', read: (value) => value ?? '', write: (value) => text(value, 100, 'printer name') },
  printPaper: {
    key: 'print_paper',
    read: (value) => (value === '2x6' ? '2x6' : '4x6'),
    write: (value) => {
      if (value !== '4x6' && value !== '2x6') throw new RequestError(400, 'Print paper must be 4x6 or 2x6')
      return value
    },
  },
  galleryEnabled: {
    key: 'gallery_enabled',
    read: (value) => value !== 'false',
    write: (value) => {
      if (typeof value !== 'boolean') throw new RequestError(400, 'Gallery on/off must be true or false')
      return String(value)
    },
  },
  autoDeleteDays: {
    key: 'auto_delete_days',
    read: (value) => Number(value ?? 0),
    write: (value) => wholeNumber(value, 0, 365, 'Auto-delete must be 0 (off) to 365 days'),
  },
}

export function readSettingsForAdmin(db: Database): Settings {
  const stored = readAllSettings(db)
  const settings: Record<string, unknown> = {}
  for (const [name, field] of Object.entries(FIELDS)) settings[name] = field.read(stored.get(field.key))
  return settings as unknown as Settings
}

// Saves the given settings; others stay as they are. Nothing is saved if any value is wrong.
export function updateSettings(db: Database, changes: Record<string, unknown>): Settings {
  const values = new Map<string, string>()
  for (const [name, value] of Object.entries(changes)) {
    const field = FIELDS[name as keyof Settings]
    if (!field) throw new RequestError(400, `Unknown setting: ${name}`)
    values.set(field.key, field.write(value))
  }
  writeSettings(db, values)
  return readSettingsForAdmin(db)
}

function wholeNumber(value: unknown, min: number, max: number, message: string): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RequestError(400, message)
  }
  return String(value)
}

function text(value: unknown, maxLength: number, label: string): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new RequestError(400, `The ${label} must be text of up to ${maxLength} characters`)
  }
  return value.trim()
}
