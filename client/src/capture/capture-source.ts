// The booth flow talks only to this interface, so the camera source can be swapped
// (webcam today, digiCamControl later) without touching the booth.
export interface CaptureSource {
  /** Open the camera. Rejects with a CaptureError. */
  start(): Promise<void>
  /** The live feed. Only valid between start() and stop(). */
  preview(): MediaStream
  /** One shot as an image. */
  capture(): Promise<Blob>
  /** Release the camera. Safe to call more than once. */
  stop(): void
}

export type CaptureErrorKind =
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'insecure'
  | 'not-started'
  /** stop() was called while start() was still opening the camera. */
  | 'cancelled'
  /** The camera went away while live (unplugged, webcam app closed). */
  | 'disconnected'
  | 'unknown'

export class CaptureError extends Error {
  readonly kind: CaptureErrorKind

  constructor(kind: CaptureErrorKind, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CaptureError'
    this.kind = kind
  }
}

export interface CameraInfo {
  deviceId: string
  label: string
}
