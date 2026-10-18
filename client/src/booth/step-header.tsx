interface StepHeaderProps {
  title: string
  onBack?: () => void
}

export function StepHeader({ title, onBack }: StepHeaderProps) {
  return (
    <div className="step-header">
      {onBack && (
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
      )}
      <h2>{title}</h2>
    </div>
  )
}
