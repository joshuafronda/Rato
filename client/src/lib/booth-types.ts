// The shapes the server sends (server/services/catalog.ts and strips.ts).
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

export interface GalleryStrip {
  shareCode: string
  imageUrl: string
  createdAt: string
}

export interface Gallery {
  enabled: boolean
  strips: GalleryStrip[]
}

export interface ShareLink {
  url: string
  qrSvg: string
}

export interface PrintJob {
  id: number
  copies: number
  imageUrl: string
}

export interface SavedStrip {
  shareCode: string
  imageUrl: string
}
