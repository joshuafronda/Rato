import { useCallback, useEffect, useState } from 'react'
import { clearPreference, readPreference, writePreference } from '../lib/preferences.ts'
import { type CameraInfo, CaptureError, type CaptureErrorKind, type CaptureSource } from './capture-source.ts'
import { WebcamSource } from './webcam-source.ts'

const CAMERA_KEY = 'cameraId'

export type CameraState =
  | { status: 'starting' }
  | { status: 'live'; stream: MediaStream }
  | { status: 'error'; kind: CaptureErrorKind }

export interface Camera {
  state: CameraState
  cameras: CameraInfo[]
  cameraId: string | null
  selectCamera: (deviceId: string) => void
  retry: () => void
  /** The open source, for taking shots. Null unless the feed is live. */
  source: CaptureSource | null
}

// Opens the chosen camera, lists the cameras once it is live, reports a camera that goes
// away mid-event, and releases the camera on unmount or when switching.
export function useCamera(): Camera {
  const [cameraId, setCameraId] = useState<string | null>(() => readPreference(CAMERA_KEY))
  const [cameras, setCameras] = useState<CameraInfo[]>([])
  const [state, setState] = useState<CameraState>({ status: 'starting' })
  const [source, setSource] = useState<CaptureSource | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const webcam = new WebcamSource(cameraId ? { deviceId: cameraId } : {})

    const onEnded = () => {
      if (cancelled) return
      webcam.stop()
      setSource(null)
      setState({ status: 'error', kind: 'disconnected' })
    }

    const open = async () => {
      try {
        await webcam.start()
      } catch (error) {
        if (cancelled) return
        const kind = error instanceof CaptureError ? error.kind : 'unknown'
        // A remembered camera that was unplugged: forget it and use the default one.
        if (kind === 'not-found' && cameraId) {
          clearPreference(CAMERA_KEY)
          setCameraId(null)
          return
        }
        setState({ status: 'error', kind })
        return
      }
      if (cancelled) return
      const stream = webcam.preview()
      for (const track of stream.getVideoTracks()) track.addEventListener('ended', onEnded)
      setState({ status: 'live', stream })
      setSource(webcam)

      // Labels are only filled in after permission is granted, so list now. A failure here
      // only means no picker; the feed itself is fine.
      const found = await WebcamSource.listCameras().catch(() => [])
      if (!cancelled) setCameras(found)
    }
    void open()

    return () => {
      cancelled = true
      webcam.stop()
      setSource(null)
    }
  }, [cameraId, attempt])

  const selectCamera = useCallback((deviceId: string) => {
    writePreference(CAMERA_KEY, deviceId)
    setState({ status: 'starting' })
    setCameraId(deviceId)
  }, [])

  const retry = useCallback(() => {
    setState({ status: 'starting' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, cameras, cameraId, selectCamera, retry, source }
}
