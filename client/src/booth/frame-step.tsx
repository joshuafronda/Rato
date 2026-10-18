import type { Frame, Layout } from '../lib/booth-types.ts'
import { StepHeader } from './step-header.tsx'
import { useFrames } from './use-catalog.ts'

interface FrameStepProps {
  layout: Layout
  onChoose: (frame: Frame | null) => void
  onBack: () => void
}

export function FrameStep({ layout, onChoose, onBack }: FrameStepProps) {
  const list = useFrames(layout.id)

  return (
    <>
      <StepHeader title="Pick a frame" onBack={onBack} />
      {list.status === 'loading' && <p className="stage-message">Loading frames…</p>}
      {list.status === 'error' && (
        <p className="stage-message" role="alert">
          {list.message}
        </p>
      )}
      {list.status === 'ready' && (
        <div className="choices">
          {list.frames.map((frame) => (
            <button key={frame.id} type="button" className="choice" onClick={() => onChoose(frame)}>
              <img className="frame-thumb" src={frame.imageUrl} alt="" />
              <span className="choice-name">{frame.name}</span>
            </button>
          ))}
          <button type="button" className="choice" onClick={() => onChoose(null)}>
            <span className="frame-thumb frame-thumb-none" aria-hidden="true" />
            <span className="choice-name">No frame</span>
          </button>
        </div>
      )}
    </>
  )
}
