import { useState } from 'react'
import type { Camera } from '../capture/use-camera.ts'
import { filterCss, grainAmount } from '../composer/filter-style.ts'
import type { Filter } from '../lib/booth-types.ts'
import { CameraStage } from './camera-stage.tsx'
import { StepHeader } from './step-header.tsx'

interface FilterStepProps {
  camera: Camera
  filters: Filter[]
  onChoose: (filter: Filter) => void
  onBack: () => void
}

export function FilterStep({ camera, filters, onChoose, onBack }: FilterStepProps) {
  const [selected, setSelected] = useState<Filter | undefined>(() => filters.find((f) => f.isDefault) ?? filters[0])

  return (
    <>
      <StepHeader title="Pick a filter" onBack={onBack} />
      <CameraStage
        state={camera.state}
        retry={camera.retry}
        filterCss={selected ? filterCss(selected.params) : undefined}
        grain={selected ? grainAmount(selected.params) : undefined}
      />
      <div className="filter-row">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className="filter-chip"
            aria-pressed={filter.id === selected?.id}
            onClick={() => setSelected(filter)}
          >
            {filter.name}
          </button>
        ))}
      </div>
      <footer className="step-actions">
        <button
          type="button"
          className="primary-action"
          disabled={!selected || camera.state.status !== 'live'}
          onClick={() => selected && onChoose(selected)}
        >
          Take the photos
        </button>
      </footer>
    </>
  )
}
