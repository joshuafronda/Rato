import type { BoothSettings, Filter, Frame, Layout, SavedStrip } from './booth-types.ts'

// Every call to the server goes through here; components never fetch directly.
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface SessionChoices {
  layoutId: number
  frameId: number | null
  filterId: number
}

export function getLayouts(): Promise<Layout[]> {
  return request('/api/layouts')
}

export function getFrames(layoutId: number): Promise<Frame[]> {
  return request(`/api/frames?layoutId=${layoutId}`)
}

export function getFilters(): Promise<Filter[]> {
  return request('/api/filters')
}

export function getBoothSettings(): Promise<BoothSettings> {
  return request('/api/booth-settings')
}

export function createSession(choices: SessionChoices): Promise<{ id: number; shots: number }> {
  return request('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(choices),
  })
}

export function uploadPhoto(sessionId: number, shotNumber: number, photo: Blob): Promise<void> {
  return request(`/api/sessions/${sessionId}/photos/${shotNumber}`, imagePost(photo))
}

export function uploadStrip(sessionId: number, strip: Blob): Promise<SavedStrip> {
  return request(`/api/sessions/${sessionId}/strip`, imagePost(strip))
}

function imagePost(image: Blob): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': image.type }, body: image }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw new ApiError(0, 'The booth server is not reachable')
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, errorMessage(body))
  return body as T
}

function errorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error
  return 'Something went wrong'
}
