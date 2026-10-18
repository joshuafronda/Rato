import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Filter, Frame, Layout } from './booth-types.ts'

const calls: string[] = []
vi.mock('./api.ts', () => ({
  createSession: vi.fn(async (choices: unknown) => {
    calls.push(`session ${JSON.stringify(choices)}`)
    return { id: 9, shots: 2 }
  }),
  uploadPhoto: vi.fn(async (id: number, shot: number) => {
    calls.push(`photo ${id}/${shot}`)
  }),
  uploadStrip: vi.fn(async (id: number) => {
    calls.push(`strip ${id}`)
    return { shareCode: 'abcdefghjk', imageUrl: '/api/strips/abcdefghjk/image' }
  }),
}))
vi.mock('../composer/compose-strip.ts', () => ({
  composeStrip: vi.fn(async (request: { caption: string; dateText: string; frameUrl: string | null }) => {
    calls.push(`compose ${request.frameUrl} "${request.caption}" "${request.dateText}"`)
    return new Blob(['png'], { type: 'image/png' })
  }),
}))

const { saveStrip } = await import('./save-strip.ts')

const layout: Layout = { id: 1, name: 'Classic duo', shots: 2, orientation: 'vertical' }
const frame: Frame = { id: 5, layoutId: 1, name: 'Classic', imageUrl: '/frames/a.svg' }
const filter: Filter = { id: 3, name: 'Warm', params: { sepia: 0.2 }, isDefault: false }
const shots = [new Blob(['a']), new Blob(['b'])]

beforeEach(() => {
  calls.length = 0
})

describe('saveStrip', () => {
  it('composes first, then creates the session and uploads every shot and the strip', async () => {
    const strip = await saveStrip({
      layout,
      frame,
      filter,
      shots,
      settings: { countdownSeconds: 3, captionText: 'Ana & Ben', dateFormat: 'MMM d, yyyy', printPaper: '4x6' },
      date: new Date(2026, 9, 7),
    })
    expect(strip.shareCode).toBe('abcdefghjk')
    expect(calls).toEqual([
      'compose /frames/a.svg "Ana & Ben" "Oct 7, 2026"',
      'session {"layoutId":1,"frameId":5,"filterId":3}',
      'photo 9/1',
      'photo 9/2',
      'strip 9',
    ])
  })

  it('sends no frame when the guest chose none', async () => {
    await saveStrip({
      layout,
      frame: null,
      filter,
      shots,
      settings: { countdownSeconds: 3, captionText: '', dateFormat: '', printPaper: '4x6' },
      date: new Date(),
    })
    expect(calls[0]).toBe('compose null "" ""')
    expect(calls[1]).toBe('session {"layoutId":1,"frameId":null,"filterId":3}')
  })
})
