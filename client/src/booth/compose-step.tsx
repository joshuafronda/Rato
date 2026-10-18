import { Button } from '../ui/button.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'

interface ComposeStepProps {
  error: string | null
  onRetry: () => void
  onStartOver: () => void
}

export function ComposeStep({ error, onRetry, onStartOver }: ComposeStepProps) {
  return (
    <div className="choices">
      {error ? (
        <ErrorBanner message={`Sorry — your strip could not be saved: ${error}`} onRetry={onRetry}>
          <Button variant="secondary" size="sm" onClick={onStartOver}>
            Start over
          </Button>
        </ErrorBanner>
      ) : (
        <p className="stage-message">Making your strip…</p>
      )}
    </div>
  )
}
