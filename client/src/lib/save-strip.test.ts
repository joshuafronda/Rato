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
  composeStrip: vi.fn(
    async (request: { caption: string; caption2: string; dateText: string; frameUrl: string | null; slots: unknown }) => {
      calls.push(`compose ${request.frameUrl} "${request.dateText}" "${request.caption}" "${request.caption2}"`)
      if (request.slots) calls.push(`slots ${JSON.stringify(request.slots)}`)
      return new Blob(['png'], { type: 'image/png' })
    },
  ),
}))

const { saveStrip } = await import('./save-strip.ts')

const layout: Layout = { id: 1, name: 'Classic duo', shots: 2, orientation: 'vertical' }
const frame: Frame = { id: 5, layoutId: 1, name: 'Classic', imageUrl: '/frames/a.svg', slots: null, showText: true }
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
      settings: {
        countdownSeconds: 3,
        captionText: 'Knowing Christ More!',
        captionLine2: 'JTFFC Batangas City',
        dateFormat: 'MMM d, yyyy',
        printPaper: '4x6',
      },
      date: new Date(2026, 9, 7),
    })
    expect(strip.shareCode).toBe('abcdefghjk')
    expect(calls).toEqual([
      'compose /frames/a.svg "Oct 7, 2026" "Knowing Christ More!" "JTFFC Batangas City"',
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
      settings: { countdownSeconds: 3, captionText: '', captionLine2: '', dateFormat: '', printPaper: '4x6' },
      date: new Date(),
    })
    expect(calls[0]).toBe('compose null "" "" ""')
    expect(calls[1]).toBe('session {"layoutId":1,"frameId":null,"filterId":3}')
  })

  it('uses a frame\'s own windows, and leaves out the text when the frame has its own', async () => {
    const windows = [{ x: 19, y: 216, width: 563, height: 394 }]
    await saveStrip({
      layout,
      frame: { ...frame, slots: windows, showText: false },
      filter,
      shots,
      settings: { countdownSeconds: 3, captionText: 'Line', captionLine2: 'Two', dateFormat: 'MMM d, yyyy', printPaper: 'A4' },
      date: new Date(2026, 9, 7),
    })
    expect(calls[0]).toBe('compose /frames/a.svg "" "" ""')
    expect(calls[1]).toBe(`slots ${JSON.stringify(windows)}`)
  })
})
