import { ShotImage } from './shot-image.tsx'

interface ReviewStepProps {
  shots: Blob[]
  onRetake: (index: number) => void
  onMakeStrip: () => void
}

export function ReviewStep({ shots, onRetake, onMakeStrip }: ReviewStepProps) {
  return (
    <>
      <div className="step-header">
        <h2>How do these look?</h2>
      </div>
      <div className="review-grid">
        {shots.map((shot, i) => (
          <figure key={i} className="review-shot">
            <ShotImage shot={shot} alt={`Shot ${i + 1}`} />
            <button type="button" className="secondary-action" onClick={() => onRetake(i)}>
              Retake shot {i + 1}
            </button>
          </figure>
        ))}
      </div>
      <footer className="step-actions">
        <button type="button" className="primary-action" onClick={onMakeStrip}>
          Make my strip
        </button>
      </footer>
    </>
  )
}
