import { useCallback, useState } from 'react'
import type { Frame, Layout } from '../lib/booth-types.ts'
import { Icon } from '../ui/icons.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'
import { FramePreview } from './frame-preview.tsx'
import { StepHeader } from './step-header.tsx'
import { useFrames } from './use-catalog.ts'

interface FrameStepProps {
  layout: Layout
  onChoose: (frame: Frame | null) => void
  onBack: () => void
}

export function FrameStep({ layout, onChoose, onBack }: FrameStepProps) {
  const list = useFrames(layout.id)
  // The frame shown enlarged; it is only chosen from the preview.
  const [previewing, setPreviewing] = useState<Frame | null>(null)
  const closePreview = useCallback(() => setPreviewing(null), [])

  return (
    <>
      <StepHeader title="Pick a frame" onBack={onBack} />
      {list.status === 'loading' && <p className="stage-message">Loading frames…</p>}
      {list.status === 'error' && <ErrorBanner message={list.message} />}
      {list.status === 'ready' && (
        <div className="choices">
          {list.frames.map((frame) => (
            <button key={frame.id} type="button" className="choice" onClick={() => setPreviewing(frame)}>
              <span className="zoom-badge" aria-hidden="true">
                <Icon name="zoom" size={18} />
              </span>
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
      {previewing && (
        <FramePreview frame={previewing} onUse={() => onChoose(previewing)} onClose={closePreview} />
      )}
    </>
  )
}
