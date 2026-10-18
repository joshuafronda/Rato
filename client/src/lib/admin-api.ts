import { jsonPost, request } from './api.ts'

export interface AdminStatus {
  /** No account exists yet. */
  setupNeeded: boolean
  username: string | null
}

export interface Overview {
  sessionsToday: number
  totalStrips: number
  totalPrints: number
  peakHours: Array<{ hour: number; sessions: number }>
  mostUsedFrame: { name: string; sessions: number } | null
}

export interface AdminLayout {
  id: number
  name: string
  shots: number
  active: boolean
}

export interface AdminFrame {
  id: number
  layoutId: number
  name: string
  imageUrl: string
  active: boolean
  sortOrder: number
}

export interface AdminFilter {
  id: number
  name: string
  active: boolean
  isDefault: boolean
}

export interface AdminStrip {
  id: number
  shareCode: string
  imageUrl: string
  isPublic: boolean
  printCount: number
  createdAt: string
}

export interface AdminPrintJob {
  id: number
  copies: number
  status: 'queued' | 'printing' | 'printed' | 'failed'
  createdAt: string
  shareCode: string
  imageUrl: string
}

export interface AdminSettings {
  countdownSeconds: number
  captionText: string
  dateFormat: string
  printer: string
  printPaper: '4x6' | '2x6'
  galleryEnabled: boolean
  autoDeleteDays: number
}

const BASE = '/api/admin'

// The zip of one day's strips (null = every day), optionally with the original shots.
export function downloadUrl(day: string | null, withPhotos: boolean): string {
  const query = new URLSearchParams()
  if (day) query.set('date', day)
  if (withPhotos) query.set('photos', '1')
  const text = query.toString()
  return `${BASE}/download${text ? `?${text}` : ''}`
}

export const adminApi = {
  status: () => request<AdminStatus>(`${BASE}/status`),
  createAccount: (username: string, password: string) => request<void>(`${BASE}/accounts`, jsonPost({ username, password })),
  login: (username: string, password: string) => request<void>(`${BASE}/login`, jsonPost({ username, password })),
  logout: () => request<void>(`${BASE}/logout`, { method: 'POST' }),
  overview: () => request<Overview>(`${BASE}/overview`),
  layouts: () => request<AdminLayout[]>(`${BASE}/layouts`),
  setLayoutActive: (id: number, active: boolean) => request<void>(`${BASE}/layouts/${id}`, jsonPost({ active }, 'PATCH')),
  frames: () => request<AdminFrame[]>(`${BASE}/frames`),
  uploadFrame: (layoutId: number, name: string, image: Blob) =>
    request<{ id: number }>(`${BASE}/frames?layoutId=${layoutId}&name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: image,
    }),
  updateFrame: (id: number, changes: { name?: string; active?: boolean }) =>
    request<void>(`${BASE}/frames/${id}`, jsonPost(changes, 'PATCH')),
  reorderFrames: (layoutId: number, ids: number[]) => request<void>(`${BASE}/frames/reorder`, jsonPost({ layoutId, ids })),
  filters: () => request<AdminFilter[]>(`${BASE}/filters`),
  setFilterActive: (id: number, active: boolean) => request<void>(`${BASE}/filters/${id}`, jsonPost({ active }, 'PATCH')),
  setDefaultFilter: (id: number) => request<void>(`${BASE}/filters/${id}/default`, { method: 'POST' }),
  strips: (page: number, day: string | null) =>
    request<AdminStrip[]>(`${BASE}/strips?page=${page}${day ? `&date=${day}` : ''}`),
  stripDays: () => request<Array<{ day: string; strips: number }>>(`${BASE}/strip-days`),
  setStripPublic: (id: number, isPublic: boolean) => request<void>(`${BASE}/strips/${id}`, jsonPost({ isPublic }, 'PATCH')),
  deleteStrip: (id: number) => request<void>(`${BASE}/strips/${id}`, { method: 'DELETE' }),
  printJobs: () => request<AdminPrintJob[]>(`${BASE}/print-jobs`),
  reprint: (id: number) => request<{ id: number }>(`${BASE}/print-jobs/${id}/reprint`, { method: 'POST' }),
  settings: () => request<AdminSettings>(`${BASE}/settings`),
  saveSettings: (changes: Partial<AdminSettings>) => request<AdminSettings>(`${BASE}/settings`, jsonPost(changes, 'PUT')),
  backup: () => request<{ path: string }>(`${BASE}/backup`, { method: 'POST' }),
}
