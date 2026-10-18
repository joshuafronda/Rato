import { useState } from 'react'
import type { Camera } from '../capture/use-camera.ts'
import { filterCss, grainAmount } from '../composer/filter-style.ts'
import type { Filter } from '../lib/booth-types.ts'
import { Button } from '../ui/button.tsx'
import { Chip } from '../ui/chip.tsx'
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
          <Chip key={filter.id} selected={filter.id === selected?.id} onClick={() => setSelected(filter)}>
            {filter.name}
          </Chip>
        ))}
      </div>
      <footer className="step-actions">
        <Button
          size="lg"
          icon="camera"
          disabled={!selected || camera.state.status !== 'live'}
          onClick={() => selected && onChoose(selected)}
        >
          Take the photos
        </Button>
      </footer>
    </>
  )
}
