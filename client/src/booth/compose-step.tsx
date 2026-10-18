interface ComposeStepProps {
  error: string | null
  onRetry: () => void
  onStartOver: () => void
}

export function ComposeStep({ error, onRetry, onStartOver }: ComposeStepProps) {
  if (!error) return <p className="stage-message">Making your strip…</p>
  return (
    <div className="stage-message" role="alert">
      <p>Your strip could not be saved: {error}</p>
      <div className="button-row">
        <button type="button" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="secondary-action" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  )
}
