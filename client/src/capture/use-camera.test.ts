// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readPreference, writePreference } from '../lib/preferences.ts'
import { useCamera } from './use-camera.ts'

// A controllable getUserMedia: each call returns a stream whose tracks we can inspect.
interface OpenCall {
  constraints: MediaStreamConstraints
  track: { stop: ReturnType<typeof vi.fn>; addEventListener: (type: string, fn: () => void) => void; end: () => void }
  stream: MediaStream
}

let calls: OpenCall[]
let failNext: Error[]
let enumerateDevices: ReturnType<typeof vi.fn>

function makeCall(constraints: MediaStreamConstraints): OpenCall {
  const listeners: Array<() => void> = []
  const track = {
    stop: vi.fn(),
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'ended') listeners.push(fn)
    },
    removeEventListener: vi.fn(),
    end: () => listeners.forEach((fn) => fn()),
  }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
  return { constraints, track, stream }
}

function domError(name: string) {
  return Object.assign(new Error(name), { name })
}

beforeEach(() => {
  calls = []
  failNext = []
  enumerateDevices = vi.fn(async () => [
    { kind: 'videoinput', deviceId: 'cam-1', label: 'Laptop camera' },
    { kind: 'videoinput', deviceId: 'cam-2', label: 'DSLR' },
  ])
  const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
    const failure = failNext.shift()
    if (failure) throw failure
    const call = makeCall(constraints)
    calls.push(call)
    return call.stream
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  })
  localStorage.clear()
})

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const deviceOf = (call: OpenCall) => (call.constraints.video as MediaTrackConstraints).deviceId

describe('useCamera', () => {
  it('goes live and lists the cameras', async () => {
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    await waitFor(() => expect(result.current.cameras).toHaveLength(2))
    expect(result.current.source).not.toBeNull()
  })

  it('leaves no camera open after a StrictMode mount and an unmount', async () => {
    const { result, unmount } = renderHook(() => useCamera(), { reactStrictMode: true })
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    unmount()
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call.track.stop).toHaveBeenCalled()
  })

  it('switches camera, releases the old one and remembers the choice', async () => {
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    const first = calls[0]

    act(() => result.current.selectCamera('cam-2'))
    await waitFor(() => expect(calls).toHaveLength(2))
    await waitFor(() => expect(result.current.state.status).toBe('live'))

    expect(first.track.stop).toHaveBeenCalled()
    expect(deviceOf(calls[1])).toEqual({ exact: 'cam-2' })
    expect(readPreference('cameraId')).toBe('cam-2')
  })

  it('falls back to the default camera when the remembered one is gone, and forgets it', async () => {
    writePreference('cameraId', 'unplugged')
    failNext.push(domError('NotFoundError'))
    const getUserMedia = navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    const firstAsked = getUserMedia.mock.calls[0][0] as MediaStreamConstraints
    expect((firstAsked.video as MediaTrackConstraints).deviceId).toEqual({ exact: 'unplugged' })
    expect(deviceOf(calls[0])).toBeUndefined()
    expect(readPreference('cameraId')).toBeNull()
  })

  it('shows "no camera found" when there is no camera at all, instead of starting forever', async () => {
    failNext.push(domError('NotFoundError'))
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', kind: 'not-found' }))
  })

  it('shows the error kind and recovers on retry', async () => {
    failNext.push(domError('NotAllowedError'))
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', kind: 'permission-denied' }))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
  })

  it('keeps the live feed when listing cameras fails', async () => {
    enumerateDevices.mockRejectedValue(new Error('enumerate failed'))
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.state.status).toBe('live')
  })

  it('reports a camera unplugged mid-event', async () => {
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state.status).toBe('live'))
    act(() => calls[0].track.end())
    expect(result.current.state).toEqual({ status: 'error', kind: 'disconnected' })
    expect(result.current.source).toBeNull()
    expect(calls[0].track.stop).toHaveBeenCalled()
  })

  it('shows an unrecognised browser error as unknown', async () => {
    failNext.push(domError('WeirdBrowserError'))
    const { result } = renderHook(() => useCamera())
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', kind: 'unknown' }))
  })
})
