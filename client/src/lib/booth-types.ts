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
  dateFormat: string
}

export interface SavedStrip {
  shareCode: string
  imageUrl: string
}
