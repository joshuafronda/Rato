import { Button } from '../ui/button.tsx'

interface StepHeaderProps {
  title: string
  onBack?: () => void
  children?: React.ReactNode
}

export function StepHeader({ title, onBack, children }: StepHeaderProps) {
  return (
    <div className="step-header">
      {onBack && (
        <Button variant="secondary" icon="back" onClick={onBack}>
          Back
        </Button>
      )}
      <h2>{title}</h2>
      {children}
    </div>
  )
}
