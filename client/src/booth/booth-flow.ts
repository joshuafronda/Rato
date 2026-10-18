import type { Filter, Frame, Layout, SavedStrip } from '../lib/booth-types.ts'

export type Step = 'lobby' | 'layout' | 'frame' | 'filter' | 'capture' | 'review' | 'compose' | 'finish'

export interface FlowState {
  step: Step
  layout: Layout | null
  frame: Frame | null
  filter: Filter | null
  /** One entry per shot in the layout; null until taken. */
  shots: Array<Blob | null>
  strip: SavedStrip | null
  /** Why saving the strip failed, shown on the compose step. */
  error: string | null
}

export type FlowAction =
  | { type: 'start' }
  | { type: 'chooseLayout'; layout: Layout }
  | { type: 'chooseFrame'; frame: Frame | null }
  | { type: 'chooseFilter'; filter: Filter }
  | { type: 'shotTaken'; shot: Blob }
  | { type: 'retake'; index: number }
  | { type: 'makeStrip' }
  | { type: 'stripSaved'; strip: SavedStrip }
  | { type: 'stripFailed'; message: string }
  | { type: 'back' }
  | { type: 'reset' }

export const initialFlow: FlowState = {
  step: 'lobby',
  layout: null,
  frame: null,
  filter: null,
  shots: [],
  strip: null,
  error: null,
}

const PREVIOUS_STEP: Partial<Record<Step, Step>> = { layout: 'lobby', frame: 'layout', filter: 'frame' }

// The guest flow as plain data, so every rule is testable without a camera or a screen.
// An action that does not belong to the current step leaves the state unchanged.
export function boothFlow(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'start':
      return state.step === 'lobby' ? { ...initialFlow, step: 'layout' } : state
    case 'chooseLayout':
      return state.step === 'layout' ? { ...state, step: 'frame', layout: action.layout, frame: null } : state
    case 'chooseFrame':
      return state.step === 'frame' ? { ...state, step: 'filter', frame: action.frame } : state
    case 'chooseFilter':
      if (state.step !== 'filter' || !state.layout) return state
      return { ...state, step: 'capture', filter: action.filter, shots: Array(state.layout.shots).fill(null) }
    case 'shotTaken':
      return state.step === 'capture' ? fillNextShot(state, action.shot) : state
    case 'retake':
      if (state.step !== 'review' || !(action.index in state.shots)) return state
      return { ...state, step: 'capture', shots: state.shots.map((shot, i) => (i === action.index ? null : shot)) }
    case 'makeStrip':
      return state.step === 'review' || state.step === 'compose' ? { ...state, step: 'compose', error: null } : state
    case 'stripSaved':
      return state.step === 'compose' ? { ...state, step: 'finish', strip: action.strip } : state
    case 'stripFailed':
      return state.step === 'compose' ? { ...state, error: action.message } : state
    case 'back': {
      const previous = PREVIOUS_STEP[state.step]
      return previous ? { ...state, step: previous } : state
    }
    case 'reset':
      return initialFlow
  }
}

function fillNextShot(state: FlowState, shot: Blob): FlowState {
  const index = state.shots.indexOf(null)
  if (index === -1) return state
  const shots = state.shots.map((existing, i) => (i === index ? shot : existing))
  return { ...state, shots, step: shots.includes(null) ? 'capture' : 'review' }
}

/** The 1-based number of the shot being taken, or null when every shot is in. */
export function currentShotNumber(state: FlowState): number | null {
  const index = state.shots.indexOf(null)
  return index === -1 ? null : index + 1
}
