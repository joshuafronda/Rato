import { useEffect, useRef, useState } from 'react'
import type { Camera } from '../capture/use-camera.ts'
import { filterCss, grainAmount } from '../composer/filter-style.ts'
import type { Filter } from '../lib/booth-types.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'
import { CameraStage } from './camera-stage.tsx'

interface CaptureStepProps {
  camera: Camera
  filter: Filter
  countdownSeconds: number
  shotNumber: number
  totalShots: number
  onShot: (shot: Blob) => void
}

type Phase =
  | { name: 'ready' }
  | { name: 'counting'; left: number }
  | { name: 'shooting' }
  /** A short breather after a shot, before the next countdown starts by itself. */
  | { name: 'pause' }

const PAUSE_MS = 1200

// One tap starts the countdown; every remaining shot then follows on its own.
export function CaptureStep({ camera, filter, countdownSeconds, shotNumber, totalShots, onShot }: CaptureStepProps) {
  const [phase, setPhase] = useState<Phase>({ name: 'ready' })
  const [error, setError] = useState<string | null>(null)
  // Read at the moment of the shot, so switching cameras mid-countdown uses the new one.
  const latest = useRef({ source: camera.source, onShot })
  useEffect(() => {
    latest.current = { source: camera.source, onShot }
  }, [camera.source, onShot])

  useEffect(() => {
    if (phase.name === 'counting') {
      const next: Phase = phase.left > 1 ? { name: 'counting', left: phase.left - 1 } : { name: 'shooting' }
      const timer = window.setTimeout(() => setPhase(next), 1000)
      return () => window.clearTimeout(timer)
    }
    if (phase.name === 'pause') {
      const timer = window.setTimeout(() => setPhase({ name: 'counting', left: countdownSeconds }), PAUSE_MS)
      return () => window.clearTimeout(timer)
    }
    if (phase.name !== 'shooting') return
    let cancelled = false
    const source = latest.current.source
    if (!source) {
      setPhase({ name: 'ready' })
      return
    }
    source.capture().then(
      (shot) => {
        if (cancelled) return
        latest.current.onShot(shot)
        setPhase({ name: 'pause' })
      },
      () => {
        if (cancelled) return
        setError('The camera did not take the photo. Try again.')
        setPhase({ name: 'ready' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [phase, countdownSeconds])

  const start = () => {
    setError(null)
    setPhase({ name: 'counting', left: countdownSeconds })
  }

  return (
    <>
      <div className="step-header">
        <h2>Smile!</h2>
        <span className="step-count">
          <Badge tone="info">
            Photo {shotNumber} of {totalShots}
          </Badge>
        </span>
      </div>
      <CameraStage
        state={camera.state}
        retry={camera.retry}
        filterCss={filterCss(filter.params)}
        grain={grainAmount(filter.params)}
      >
        {phase.name === 'counting' && (
          <div className="countdown" aria-live="assertive">
            {phase.left}
          </div>
        )}
        {phase.name === 'shooting' && <div className="flash" />}
        {phase.name === 'pause' && <div className="countdown countdown-note">Get ready…</div>}
      </CameraStage>
      <footer className="step-actions">
        {error && <ErrorBanner message={error} />}
        {phase.name === 'ready' && (
          <Button size="lg" onClick={start} disabled={!camera.source}>
            Start the countdown
          </Button>
        )}
      </footer>
    </>
  )
}
