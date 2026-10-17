import type { CaptureErrorKind } from '../capture/capture-source.ts'
import { useCamera } from '../capture/use-camera.ts'
import { CameraPreview } from './camera-preview.tsx'

const ERROR_MESSAGES: Record<CaptureErrorKind, string> = {
  'permission-denied': 'Camera access was blocked. Allow the camera in the browser, then try again.',
  'not-found': 'No camera found. Plug in a camera or start the camera’s webcam app, then try again.',
  'in-use': 'The camera is busy in another app. Close that app, then try again.',
  insecure: 'The camera only works when this page is opened on the laptop (localhost) or over https://.',
  'not-started': 'The camera has not started yet. Try again.',
  cancelled: 'The camera was stopped while it was opening. Try again.',
  disconnected: 'The camera was disconnected. Check the cable or the camera’s webcam app, then try again.',
  unknown: 'Something went wrong opening the camera. Try again.',
}

export function BoothScreen() {
  const { state, cameras, cameraId, selectCamera, retry } = useCamera()

  return (
    <main className="booth">
      <header className="booth-header">
        <h1>StripShot</h1>
        {cameras.length > 1 && (
          <label className="camera-picker">
            Camera
            <select value={cameraId ?? ''} onChange={(event) => selectCamera(event.target.value)}>
              {!cameraId && <option value="">Default camera</option>}
              {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <section className="stage" aria-live="polite">
        {state.status === 'starting' && <p className="stage-message">Starting the camera…</p>}
        {state.status === 'live' && <CameraPreview stream={state.stream} />}
        {state.status === 'error' && (
          <div className="stage-message" role="alert">
            <p>{ERROR_MESSAGES[state.kind]}</p>
            <button type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
