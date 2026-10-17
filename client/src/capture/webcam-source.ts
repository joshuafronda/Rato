import { type CameraInfo, CaptureError, type CaptureErrorKind, type CaptureSource } from './capture-source.ts'
import { type FrameGrabber, grabFrame } from './frame-grabber.ts'

export interface WebcamOptions {
  /** A specific camera from listCameras(). Wins over facingMode. */
  deviceId?: string
  /** 'user' = front camera, 'environment' = back camera (tablets and phones). */
  facingMode?: 'user' | 'environment'
}

// Any camera the browser can see: laptop webcam, USB webcam, a DSLR through its
// webcam utility, or a tablet's front/back camera.
export class WebcamSource implements CaptureSource {
  private stream: MediaStream | null = null
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
    try {
      this.stream = await this.media.getUserMedia({ audio: false, video: this.constraints() })
    } catch (error) {
      throw toCaptureError(error)
    }
  }

  preview(): MediaStream {
    if (!this.stream) throw new CaptureError('not-started', 'Call start() before preview()')
    return this.stream
  }

  capture(): Promise<Blob> {
    return this.grab(this.preview())
  }

  stop(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop()
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

const ERROR_KINDS: Record<string, CaptureErrorKind> = {
  NotAllowedError: 'permission-denied',
  SecurityError: 'permission-denied',
  NotFoundError: 'not-found',
  OverconstrainedError: 'not-found',
  NotReadableError: 'in-use',
  AbortError: 'in-use',
}

function toCaptureError(error: unknown): CaptureError {
  const name = error instanceof Error ? error.name : ''
  const kind = ERROR_KINDS[name] ?? 'unknown'
  return new CaptureError(kind, `Could not open the camera (${name || 'unknown error'})`, { cause: error })
}
