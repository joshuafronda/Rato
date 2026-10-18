import type { SavedStrip } from '../lib/booth-types.ts'

interface FinishStepProps {
  strip: SavedStrip
  onDone: () => void
}

// Printing, the QR code and the gallery arrive in Phase 3.
export function FinishStep({ strip, onDone }: FinishStepProps) {
  return (
    <>
      <div className="step-header">
        <h2>Your strip is ready!</h2>
      </div>
      <div className="finish">
        <img className="finished-strip" src={strip.imageUrl} alt="Your photo strip" />
      </div>
      <footer className="step-actions">
        <button type="button" className="primary-action" onClick={onDone}>
          Done
        </button>
      </footer>
    </>
  )
}
