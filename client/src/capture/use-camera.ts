import { useCallback, useEffect, useState } from 'react'
import { readPreference, writePreference } from '../lib/preferences.ts'
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
  /** The open source, for taking shots. Null until the feed is live. */
  source: CaptureSource | null
}

// Opens the chosen camera, keeps the camera list fresh and releases the camera on unmount.
export function useCamera(): Camera {
  const [cameraId, setCameraId] = useState<string | null>(() => readPreference(CAMERA_KEY))
  const [cameras, setCameras] = useState<CameraInfo[]>([])
  const [state, setState] = useState<CameraState>({ status: 'starting' })
  const [source, setSource] = useState<CaptureSource | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const webcam = new WebcamSource(cameraId ? { deviceId: cameraId } : {})

    webcam
      .start()
      .then(async () => {
        if (cancelled) return
        setState({ status: 'live', stream: webcam.preview() })
        setSource(webcam)
        // Labels are only filled in after permission is granted, so list now.
        const found = await WebcamSource.listCameras()
        if (!cancelled) setCameras(found)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const kind = error instanceof CaptureError ? error.kind : 'unknown'
        // A remembered camera that was unplugged: fall back to the default one.
        if (kind === 'not-found' && cameraId) {
          setCameraId(null)
          return
        }
        setState({ status: 'error', kind })
      })

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
