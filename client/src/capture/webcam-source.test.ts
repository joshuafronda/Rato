import { describe, expect, it, vi } from 'vitest'
import { CaptureError } from './capture-source.ts'
import { WebcamSource } from './webcam-source.ts'

function fakeTrack() {
  return { stop: vi.fn() }
}

function fakeStream(tracks = [fakeTrack()]) {
  return { getTracks: () => tracks } as unknown as MediaStream
}

function fakeMedia(overrides: Partial<MediaDevices> = {}) {
  return {
    getUserMedia: vi.fn(async () => fakeStream()),
    enumerateDevices: vi.fn(async () => []),
    ...overrides,
  } as unknown as MediaDevices
}

function domError(name: string) {
  return Object.assign(new Error(name), { name })
}

describe('WebcamSource', () => {
  it('opens the chosen camera by device id', async () => {
    const media = fakeMedia()
    await new WebcamSource({ deviceId: 'cam-2' }, media).start()
    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: expect.objectContaining({ deviceId: { exact: 'cam-2' } }),
    })
  })

  it('opens the front or back camera by facing mode', async () => {
    const media = fakeMedia()
    await new WebcamSource({ facingMode: 'environment' }, media).start()
    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
    })
  })

  it('returns the live stream from preview() after start()', async () => {
    const stream = fakeStream()
    const source = new WebcamSource({}, fakeMedia({ getUserMedia: vi.fn(async () => stream) }))
    expect(() => source.preview()).toThrow(CaptureError)
    await source.start()
    expect(source.preview()).toBe(stream)
  })

  it('releases every track on stop()', async () => {
    const tracks = [fakeTrack(), fakeTrack()]
    const source = new WebcamSource({}, fakeMedia({ getUserMedia: vi.fn(async () => fakeStream(tracks)) }))
    await source.start()
    source.stop()
    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce()
    expect(() => source.preview()).toThrow(CaptureError)
  })

  it('captures one shot through the frame grabber', async () => {
    const shot = new Blob(['jpeg'], { type: 'image/jpeg' })
    const grabFrame = vi.fn(async () => shot)
    const source = new WebcamSource({}, fakeMedia(), grabFrame)
    await source.start()
    await expect(source.capture()).resolves.toBe(shot)
    expect(grabFrame).toHaveBeenCalledWith(source.preview())
  })

  it('releases a stream that arrives after stop() was called', async () => {
    const lateTrack = fakeTrack()
    let resolveOpen: (stream: MediaStream) => void = () => {}
    const pending = new Promise<MediaStream>((resolve) => {
      resolveOpen = resolve
    })
    const source = new WebcamSource({}, fakeMedia({ getUserMedia: vi.fn(() => pending) }))

    const starting = source.start()
    source.stop()
    resolveOpen(fakeStream([lateTrack]))

    await expect(starting).rejects.toMatchObject({ kind: 'cancelled' })
    expect(lateTrack.stop).toHaveBeenCalledOnce()
    expect(() => source.preview()).toThrow(CaptureError)
  })

  it('releases the previous stream when started again', async () => {
    const firstTrack = fakeTrack()
    const getUserMedia = vi.fn().mockResolvedValueOnce(fakeStream([firstTrack])).mockResolvedValueOnce(fakeStream())
    const source = new WebcamSource({}, fakeMedia({ getUserMedia }))
    await source.start()
    await source.start()
    expect(firstTrack.stop).toHaveBeenCalledOnce()
  })

  it('rejects capture() before start()', async () => {
    await expect(new WebcamSource({}, fakeMedia()).capture()).rejects.toMatchObject({ kind: 'not-started' })
  })

  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'not-found'],
    ['OverconstrainedError', 'not-found'],
    ['NotReadableError', 'in-use'],
    ['AbortError', 'in-use'],
    ['TypeError', 'unknown'],
  ])('maps %s to the %s error kind', async (name, kind) => {
    const media = fakeMedia({ getUserMedia: vi.fn(async () => Promise.reject(domError(name))) })
    await expect(new WebcamSource({}, media).start()).rejects.toMatchObject({ kind })
  })

  it('reads the error name from rejections that are not Error instances', async () => {
    const media = fakeMedia({ getUserMedia: vi.fn(async () => Promise.reject({ name: 'NotFoundError' })) })
    await expect(new WebcamSource({}, media).start()).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('reports an insecure page when the browser hides the camera API', async () => {
    await expect(new WebcamSource({}, null).start()).rejects.toMatchObject({ kind: 'insecure' })
  })

  it('lists only video inputs as cameras', async () => {
    const media = fakeMedia({
      enumerateDevices: vi.fn(async () => [
        { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
        { kind: 'videoinput', deviceId: 'cam-1', label: 'Front Camera' },
        { kind: 'videoinput', deviceId: 'cam-2', label: '' },
      ]) as unknown as MediaDevices['enumerateDevices'],
    })
    await expect(WebcamSource.listCameras(media)).resolves.toEqual([
      { deviceId: 'cam-1', label: 'Front Camera' },
      { deviceId: 'cam-2', label: 'Camera 2' },
    ])
  })
})
