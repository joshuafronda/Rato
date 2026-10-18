import { useEffect, useRef } from 'react'
import type { Frame } from '../lib/booth-types.ts'
import { Button } from '../ui/button.tsx'

interface FramePreviewProps {
  frame: Frame
  onUse: () => void
  onClose: () => void
}

// A frame enlarged, so guests can see it properly before choosing. The see-through windows
// show a soft pattern where their photos will go.
export function FramePreview({ frame, onUse, onClose }: FramePreviewProps) {
  const useButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    useButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="frame-preview-backdrop" onClick={onClose}>
      <div
        className="frame-preview"
        role="dialog"
        aria-modal="true"
        aria-label="Frame preview"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{frame.name}</h2>
        <div className="frame-preview-image">
          <img src={frame.imageUrl} alt={`${frame.name} frame, enlarged`} />
        </div>
        <p className="caption">Your photos go in the clear spaces.</p>
        <div className="button-row">
          <Button variant="secondary" size="lg" icon="back" onClick={onClose}>
            Back to frames
          </Button>
          <Button ref={useButton} size="lg" onClick={onUse}>
            Use this frame
          </Button>
        </div>
      </div>
    </div>
  )
}
