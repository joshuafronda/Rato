import type { CaptureErrorKind } from '../capture/capture-source.ts'
import type { CameraState } from '../capture/use-camera.ts'
import { ErrorBanner } from '../ui/error-banner.tsx'
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

interface CameraStageProps {
  state: CameraState
  retry: () => void
  filterCss?: string
  grain?: number
  children?: React.ReactNode
}

// The live feed, or why it is missing. Children are drawn over the feed (countdown, flash).
export function CameraStage({ state, retry, filterCss, grain, children }: CameraStageProps) {
  return (
    <section className="stage" aria-live="polite">
      {state.status === 'starting' && <p className="stage-message">Starting the camera…</p>}
      {state.status === 'live' && <CameraPreview stream={state.stream} filterCss={filterCss} grain={grain} />}
      {state.status === 'error' && <ErrorBanner message={ERROR_MESSAGES[state.kind]} onRetry={retry} />}
      {state.status === 'live' && children}
    </section>
  )
}
