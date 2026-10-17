import { type CameraInfo, CaptureError, type CaptureErrorKind, type CaptureSource } from './capture-source.ts'
import { type FrameGrabber, grabFrame } from './frame-grabber.ts'

export interface WebcamOptions {
  /** A specific camera from listCameras(). Wins over facingMode. */
  deviceId?: string
  /** 'user' = front camera, 'environment' = back camera (tablets and phones). */
  facingMode?: 'user' | 'environment'
}

// Any camera the browser can see: laptop webcam, USB webcam, or a DSLR through its webcam
// utility. A tablet's own front/back camera also works, but only when the booth page is
// served over https (browsers hide the camera on plain http://<laptop-ip>) - planned for
// Phase 3.
export class WebcamSource implements CaptureSource {
  private stream: MediaStream | null = null
  // Bumped by every start() and stop(), so a start() that was overtaken can tell.
  private generation = 0
  private readonly options: WebcamOptions
  private readonly media: MediaDevices | null
  private readonly grab: FrameGrabber

  constructor(options: WebcamOptions = {}, media: MediaDevices | null = navigator.mediaDevices ?? null, grab = grabFrame) {
    this.options = options
    this.media = media
    this.grab = grab
  }

  static async listCameras(media: MediaDevices | null = navigator.mediaDevices ?? null): Promise<CameraInfo[]> {
    if (!media) return []
    const devices = await media.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Camera ${index + 1}` }))
  }

  async start(): Promise<void> {
    if (!this.media?.getUserMedia) {
      throw new CaptureError('insecure', 'The camera only works on localhost or an https:// address')
    }
    this.stop()
    const generation = this.generation
    let stream: MediaStream
    try {
      stream = await this.media.getUserMedia({ audio: false, video: this.constraints() })
    } catch (error) {
      throw toCaptureError(error)
    }
    // stop() or another start() ran while the camera was opening: release this stream
    // instead of leaving the camera on with nothing holding it.
    if (generation !== this.generation) {
      releaseTracks(stream)
      throw new CaptureError('cancelled', 'The camera was stopped while it was opening')
    }
    this.stream = stream
  }

  preview(): MediaStream {
    if (!this.stream) throw new CaptureError('not-started', 'Call start() before preview()')
    return this.stream
  }

  async capture(): Promise<Blob> {
    return this.grab(this.preview())
  }

  stop(): void {
    this.generation += 1
    if (this.stream) releaseTracks(this.stream)
    this.stream = null
  }

  private constraints(): MediaTrackConstraints {
    // Ask for HD; the browser picks the closest the camera supports.
    const video: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } }
    if (this.options.deviceId) video.deviceId = { exact: this.options.deviceId }
    else if (this.options.facingMode) video.facingMode = { ideal: this.options.facingMode }
    return video
  }
}

function releaseTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

const ERROR_KINDS: Record<string, CaptureErrorKind> = {
  NotAllowedError: 'permission-denied',
  SecurityError: 'permission-denied',
  NotFoundError: 'not-found',
  OverconstrainedError: 'not-found',
  NotReadableError: 'in-use',
  AbortError: 'in-use',
}

// Some browsers reject with plain objects (OverconstrainedError, MediaStreamError), so read
// the name from any object, not only Error instances.
function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return ''
  return typeof error.name === 'string' ? error.name : ''
}

function toCaptureError(error: unknown): CaptureError {
  const name = errorName(error)
  const kind = ERROR_KINDS[name] ?? 'unknown'
  return new CaptureError(kind, `Could not open the camera (${name || 'unknown error'})`, { cause: error })
}
