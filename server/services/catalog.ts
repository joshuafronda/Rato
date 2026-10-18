import { copyFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  type FilterRow,
  type FrameRow,
  type LayoutRow,
  listActiveFilters,
  listActiveFrames,
  listActiveLayouts,
  readSettings,
} from '../db/catalog-queries.ts'
import type { Database } from '../db/connection.ts'

const STARTER_FRAMES_DIR = join(import.meta.dirname, '..', 'assets', 'frames')

// Frame files are served from storage/frames/ at this URL path.
export const FRAMES_URL = '/frames'

export interface Layout {
  id: number
  name: string
  shots: number
  orientation: string
}

export interface Frame {
  id: number
  layoutId: number
  name: string
  imageUrl: string
  /** The frame's own photo windows, or null for the layout's standard holes. */
  slots: Slot[] | null
  /** Draw the date and caption lines on this frame. */
  showText: boolean
}

export interface Slot {
  x: number
  y: number
  width: number
  height: number
}

export interface Filter {
  id: number
  name: string
  params: Record<string, number>
  isDefault: boolean
}

export interface BoothSettings {
  countdownSeconds: number
  captionText: string
  captionLine2: string
  dateFormat: string
  printPaper: PrintPaper
}

export type PrintPaper = '4x6' | '2x6' | 'A4'
const PRINT_PAPERS: readonly PrintPaper[] = ['4x6', '2x6', 'A4']

const DEFAULT_COUNTDOWN_SECONDS = 3

export function layouts(db: Database): Layout[] {
  return listActiveLayouts(db).map(toLayout)
}

export function framesForLayout(db: Database, layoutId: number): Frame[] {
  return listActiveFrames(db, layoutId).map(toFrame)
}

export function filters(db: Database): Filter[] {
  return listActiveFilters(db).map(toFilter)
}

export function boothSettings(db: Database): BoothSettings {
  const settings = readSettings(db, ['countdown_seconds', 'caption_text', 'caption_line2', 'date_format', 'print_paper'])
  const countdown = Number(settings.get('countdown_seconds'))
  return {
    countdownSeconds: Number.isInteger(countdown) && countdown > 0 ? countdown : DEFAULT_COUNTDOWN_SECONDS,
    captionText: settings.get('caption_text') ?? '',
    captionLine2: settings.get('caption_line2') ?? '',
    dateFormat: settings.get('date_format') ?? '',
    printPaper: printPaper(settings.get('print_paper')),
  }
}

// The stored print_paper setting, or 4x6 when it is missing or unknown.
export function printPaper(value: string | undefined): PrintPaper {
  return PRINT_PAPERS.find((paper) => paper === value) ?? '4x6'
}

// Copies the built-in frames into storage/frames/ unless they are already there, so a frame
// the admin replaced on disk is never overwritten.
export function installStarterFrames(framesDir: string): void {
  for (const file of readdirSync(STARTER_FRAMES_DIR)) {
    const target = join(framesDir, file)
    if (!existsSync(target)) copyFileSync(join(STARTER_FRAMES_DIR, file), target)
  }
}

export function toLayout(row: LayoutRow): Layout {
  return { id: row.id, name: row.name, shots: row.shots, orientation: row.orientation }
}

export function toFrame(row: FrameRow): Frame {
  return {
    id: row.id,
    layoutId: row.layout_id,
    name: row.name,
    imageUrl: `${FRAMES_URL}/${encodeURIComponent(row.image_path)}`,
    slots: row.slots === null ? null : (JSON.parse(row.slots) as Slot[]),
    showText: row.show_text === 1,
  }
}

export function toFilter(row: FilterRow): Filter {
  return { id: row.id, name: row.name, params: numericParams(row.params), isDefault: row.is_default === 1 }
}

// params is admin-editable JSON; the booth only ever needs finite numbers from it.
function numericParams(json: string): Record<string, number> {
  const parsed: unknown = JSON.parse(json)
  const params: Record<string, number> = {}
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return params
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'number' && Number.isFinite(value)) params[key] = value
  }
  return params
}
