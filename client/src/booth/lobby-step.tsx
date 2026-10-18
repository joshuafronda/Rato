import type { Camera } from '../capture/use-camera.ts'
import { useGallery } from '../gallery/use-gallery.ts'
import { Button } from '../ui/button.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'
import { CameraStage } from './camera-stage.tsx'
import type { Catalog } from './use-catalog.ts'

interface LobbyStepProps {
  camera: Camera
  catalog: Catalog
  retryCatalog: () => void
  onStart: () => void
}

const SAMPLE_COUNT = 3

export function LobbyStep({ camera, catalog, retryCatalog, onStart }: LobbyStepProps) {
  const gallery = useGallery(SAMPLE_COUNT)
  const samples = gallery.status === 'ready' ? gallery.strips : []

  return (
    <>
      <div className="lobby">
        <CameraStage state={camera.state} retry={camera.retry} />
        {samples.length > 0 && (
          <aside className="samples" aria-label="Sample strips">
            {samples.map((strip) => (
              <img key={strip.shareCode} src={strip.imageUrl} alt="A sample strip" />
            ))}
          </aside>
        )}
      </div>
      <footer className="step-actions">
        {catalog.status === 'error' ? (
          <ErrorBanner message={catalog.message} onRetry={retryCatalog} />
        ) : (
          <Button size="lg" icon="camera" onClick={onStart} disabled={catalog.status !== 'ready'}>
            Start
          </Button>
        )}
      </footer>
    </>
  )
}
