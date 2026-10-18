import { Button } from '../ui/button.tsx'
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
            <Button variant="secondary" size="sm" onClick={() => onRetake(i)}>
              Retake shot {i + 1}
            </Button>
          </figure>
        ))}
      </div>
      <footer className="step-actions">
        <Button size="lg" onClick={onMakeStrip}>
          Make my strip
        </Button>
      </footer>
    </>
  )
}
