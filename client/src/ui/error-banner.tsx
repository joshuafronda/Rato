// The design's error message: soft red panel, the problem in plain words, and a retry.
export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Try again',
  children,
}: {
  message: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
  children?: React.ReactNode
}) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      {(onRetry || children) && (
        <div className="error-banner-actions">
          {onRetry && (
            <button type="button" className="btn btn-destructive btn-sm" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
