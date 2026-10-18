import { describe, expect, it } from 'vitest'
import type { Filter, Frame, Layout } from '../lib/booth-types.ts'
import { type FlowState, boothFlow, initialFlow } from './booth-flow.ts'

const layout: Layout = { id: 1, name: 'Classic duo', shots: 2, orientation: 'vertical' }
const frame: Frame = { id: 5, layoutId: 1, name: 'Classic', imageUrl: '/frames/a.svg' }
const natural: Filter = { id: 1, name: 'Natural', params: {}, isDefault: true }
const warm: Filter = { id: 2, name: 'Warm', params: { sepia: 0.2 }, isDefault: false }
const shot = (name: string) => new Blob([name], { type: 'image/jpeg' })

function run(...actions: Parameters<typeof boothFlow>[1][]): FlowState {
  return actions.reduce(boothFlow, initialFlow)
}

const atCapture = [
  { type: 'start' },
  { type: 'chooseLayout', layout },
  { type: 'chooseFrame', frame },
  { type: 'chooseFilter', filter: warm },
] as const

describe('boothFlow', () => {
  it('walks lobby, layout, frame, filter, capture', () => {
    expect(initialFlow.step).toBe('lobby')
    expect(run({ type: 'start' }).step).toBe('layout')
    expect(run({ type: 'start' }, { type: 'chooseLayout', layout }).step).toBe('frame')
    const state = run(...atCapture)
    expect(state).toMatchObject({ step: 'capture', layout, frame, filter: warm, shots: [null, null] })
  })

  it('fills shots in order, then moves to review', () => {
    const one = run(...atCapture, { type: 'shotTaken', shot: shot('a') })
    expect(one.step).toBe('capture')
    expect(one.shots.map(Boolean)).toEqual([true, false])
    const both = boothFlow(one, { type: 'shotTaken', shot: shot('b') })
    expect(both.step).toBe('review')
  })

  it('retakes one shot and returns to review with the others kept', () => {
    const a = shot('a')
    const reviewing = run(...atCapture, { type: 'shotTaken', shot: a }, { type: 'shotTaken', shot: shot('b') })
    const retaking = boothFlow(reviewing, { type: 'retake', index: 1 })
    expect(retaking.step).toBe('capture')
    expect(retaking.shots).toEqual([a, null])
    const again = boothFlow(retaking, { type: 'shotTaken', shot: shot('c') })
    expect(again.step).toBe('review')
    expect(again.shots[0]).toBe(a)
  })

  it('saves the strip, reports a failure, and can retry', () => {
    const reviewing = run(...atCapture, { type: 'shotTaken', shot: shot('a') }, { type: 'shotTaken', shot: shot('b') })
    const saving = boothFlow(reviewing, { type: 'makeStrip' })
    expect(saving).toMatchObject({ step: 'compose', error: null })
    const failed = boothFlow(saving, { type: 'stripFailed', message: 'Server is down' })
    expect(failed).toMatchObject({ step: 'compose', error: 'Server is down' })
    const retry = boothFlow(failed, { type: 'makeStrip' })
    expect(retry.error).toBeNull()
    const done = boothFlow(retry, { type: 'stripSaved', strip: { shareCode: 'abcdefghjk', imageUrl: '/x.png' } })
    expect(done).toMatchObject({ step: 'finish', strip: { shareCode: 'abcdefghjk' } })
  })

  it('goes back one step from the pickers', () => {
    const atFilter = run({ type: 'start' }, { type: 'chooseLayout', layout }, { type: 'chooseFrame', frame: null })
    expect(atFilter.step).toBe('filter')
    expect(boothFlow(atFilter, { type: 'back' }).step).toBe('frame')
    expect(run({ type: 'start' }, { type: 'back' }).step).toBe('lobby')
  })

  it('ignores actions that do not belong to the current step', () => {
    const lobby = run({ type: 'shotTaken', shot: shot('a') }, { type: 'makeStrip' }, { type: 'retake', index: 0 })
    expect(lobby).toEqual(initialFlow)
    const reviewing = run(...atCapture, { type: 'shotTaken', shot: shot('a') }, { type: 'shotTaken', shot: shot('b') })
    expect(boothFlow(reviewing, { type: 'retake', index: 7 })).toBe(reviewing)
  })

  it('reset always returns to a clean lobby', () => {
    const state = run(...atCapture, { type: 'shotTaken', shot: shot('a') }, { type: 'reset' })
    expect(state).toEqual(initialFlow)
  })
})

it('keeps natural as a valid filter choice', () => {
  expect(run({ type: 'start' }, { type: 'chooseLayout', layout }, { type: 'chooseFrame', frame: null }, { type: 'chooseFilter', filter: natural }).filter).toBe(natural)
})
