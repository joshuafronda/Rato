import type { Layout } from '../lib/booth-types.ts'
import { StepHeader } from './step-header.tsx'

interface LayoutStepProps {
  layouts: Layout[]
  onChoose: (layout: Layout) => void
  onBack: () => void
}

export function LayoutStep({ layouts, onChoose, onBack }: LayoutStepProps) {
  return (
    <>
      <StepHeader title="Pick your strip" onBack={onBack} />
      <div className="choices">
        {layouts.map((layout) => (
          <button key={layout.id} type="button" className="choice" onClick={() => onChoose(layout)}>
            <span className="mini-strip" aria-hidden="true">
              {Array.from({ length: layout.shots }, (_, i) => (
                <span key={i} className="mini-shot" />
              ))}
            </span>
            <span className="choice-name">{layout.name}</span>
            <span className="choice-detail">{layout.shots} photos</span>
          </button>
        ))}
      </div>
    </>
  )
}
