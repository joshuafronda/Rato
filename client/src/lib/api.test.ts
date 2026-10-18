import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createSession, getLayouts, uploadPhoto, uploadStrip } from './api.ts'

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('reads JSON from the server', async () => {
    const fetchMock = respond(200, [{ id: 1 }])
    expect(await getLayouts()).toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledWith('/api/layouts', undefined)
  })

  it('posts JSON and images with the right content type', async () => {
    const fetchMock = respond(201, { id: 3, shots: 2 })
    await createSession({ layoutId: 1, frameId: null, filterId: 2 })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layoutId: 1, frameId: null, filterId: 2 }),
    })
    const photo = new Blob(['x'], { type: 'image/jpeg' })
    await uploadPhoto(3, 2, photo)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sessions/3/photos/2', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: photo,
    })
    const strip = new Blob(['x'], { type: 'image/png' })
    await uploadStrip(3, strip)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sessions/3/strip', expect.objectContaining({ body: strip }))
  })

  it('throws the server error message', async () => {
    respond(409, { error: 'Upload every shot first' })
    await expect(uploadStrip(3, new Blob())).rejects.toEqual(new ApiError(409, 'Upload every shot first'))
  })

  it('throws a plain message when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(getLayouts()).rejects.toEqual(new ApiError(0, 'The booth server is not reachable'))
  })
})
