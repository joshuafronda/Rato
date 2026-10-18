import { useCallback, useReducer, useRef } from 'react'
import { useCamera } from '../capture/use-camera.ts'
import { saveStrip } from '../lib/save-strip.ts'
import { boothFlow, currentShotNumber, initialFlow } from './booth-flow.ts'
import { CaptureStep } from './capture-step.tsx'
import { ComposeStep } from './compose-step.tsx'
import { FilterStep } from './filter-step.tsx'
import { FinishStep } from './finish-step.tsx'
import { FrameStep } from './frame-step.tsx'
import { LayoutStep } from './layout-step.tsx'
import { LobbyStep } from './lobby-step.tsx'
import { ReviewStep } from './review-step.tsx'
import { useCatalog } from './use-catalog.ts'
import { useIdleReset } from './use-idle-reset.ts'
import { usePrintQueue } from './use-print-queue.ts'

// A guest who walks away is back at the lobby after this long without a tap.
const IDLE_RESET_MS = 90_000

export function BoothScreen() {
  const camera = useCamera()
  const { catalog, retry: retryCatalog } = useCatalog()
  const [flow, dispatch] = useReducer(boothFlow, initialFlow)
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  const onShot = useCallback((shot: Blob) => dispatch({ type: 'shotTaken', shot }), [])
  useIdleReset(flow.step !== 'lobby', reset, IDLE_RESET_MS)
  const checkPrintQueue = usePrintQueue(catalog.status === 'ready' ? catalog.settings.printPaper : null)
  // A double tap must not save the strip twice.
  const saving = useRef(false)

  const makeStrip = async () => {
    if (saving.current || catalog.status !== 'ready' || !flow.layout || !flow.filter) return
    saving.current = true
    dispatch({ type: 'makeStrip' })
    try {
      const strip = await saveStrip({
        layout: flow.layout,
        frame: flow.frame,
        filter: flow.filter,
        shots: flow.shots.filter((shot) => shot !== null),
        settings: catalog.settings,
        date: new Date(),
      })
      dispatch({ type: 'stripSaved', strip })
    } catch (error) {
      dispatch({ type: 'stripFailed', message: error instanceof Error ? error.message : 'Something went wrong' })
    } finally {
      saving.current = false
    }
  }

  const ready = catalog.status === 'ready' ? catalog : null
  const shotNumber = currentShotNumber(flow)

  return (
    <main className="booth">
      <header className="booth-header">
        <h1>Rato</h1>
        {flow.step === 'lobby' && camera.cameras.length > 1 && (
          <label className="camera-picker">
            Camera
            <select value={camera.cameraId ?? ''} onChange={(event) => camera.selectCamera(event.target.value)}>
              {!camera.cameraId && <option value="">Default camera</option>}
              {camera.cameras.map((option) => (
                <option key={option.deviceId} value={option.deviceId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {flow.step === 'lobby' && (
        <LobbyStep
          camera={camera}
          catalog={catalog}
          retryCatalog={retryCatalog}
          onStart={() => dispatch({ type: 'start' })}
        />
      )}
      {flow.step === 'layout' && ready && (
        <LayoutStep
          layouts={ready.layouts}
          onChoose={(layout) => dispatch({ type: 'chooseLayout', layout })}
          onBack={() => dispatch({ type: 'back' })}
        />
      )}
      {flow.step === 'frame' && flow.layout && (
        <FrameStep
          layout={flow.layout}
          onChoose={(frame) => dispatch({ type: 'chooseFrame', frame })}
          onBack={() => dispatch({ type: 'back' })}
        />
      )}
      {flow.step === 'filter' && ready && (
        <FilterStep
          camera={camera}
          filters={ready.filters}
          onChoose={(filter) => dispatch({ type: 'chooseFilter', filter })}
          onBack={() => dispatch({ type: 'back' })}
        />
      )}
      {flow.step === 'capture' && ready && flow.filter && shotNumber !== null && (
        <CaptureStep
          camera={camera}
          filter={flow.filter}
          countdownSeconds={ready.settings.countdownSeconds}
          shotNumber={shotNumber}
          totalShots={flow.shots.length}
          onShot={onShot}
        />
      )}
      {flow.step === 'review' && (
        <ReviewStep
          shots={flow.shots.filter((shot) => shot !== null)}
          onRetake={(index) => dispatch({ type: 'retake', index })}
          onMakeStrip={makeStrip}
        />
      )}
      {flow.step === 'compose' && <ComposeStep error={flow.error} onRetry={makeStrip} onStartOver={reset} />}
      {flow.step === 'finish' && flow.strip && <FinishStep strip={flow.strip} onPrintQueued={checkPrintQueue} onDone={reset} />}
    </main>
  )
}
