import type { Camera } from '../capture/use-camera.ts'
import type { Catalog } from './use-catalog.ts'
import { CameraStage } from './camera-stage.tsx'

interface LobbyStepProps {
  camera: Camera
  catalog: Catalog
  retryCatalog: () => void
  onStart: () => void
}

export function LobbyStep({ camera, catalog, retryCatalog, onStart }: LobbyStepProps) {
  return (
    <>
      <CameraStage state={camera.state} retry={camera.retry} />
      <footer className="step-actions">
        {catalog.status === 'error' ? (
          <div role="alert" className="step-error">
            <p>{catalog.message}</p>
            <button type="button" onClick={retryCatalog}>
              Try again
            </button>
          </div>
        ) : (
          <button type="button" className="primary-action" onClick={onStart} disabled={catalog.status !== 'ready'}>
            Start
          </button>
        )}
      </footer>
    </>
  )
}
