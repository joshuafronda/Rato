import { describe, expect, it } from 'vitest'
import { type Picture, drawStrip } from './compose-strip.ts'
import { STRIP, stripSlots } from './strip-layout.ts'

// Records every call and property write in order, like a canvas would receive them.
function recordingContext() {
  const log: string[] = []
  const target = {} as Record<string, unknown>
  const context = new Proxy(target, {
    get(_, key: string) {
      if (key in target) return target[key]
      return (...args: unknown[]) => {
        log.push(`${key}(${args.map(label).join(', ')})`)
        return key === 'createPattern' ? 'pattern' : undefined
      }
    },
    set(_, key: string, value) {
      log.push(`${key}=${label(value)}`)
      return true
    },
  })
  return { context: context as unknown as CanvasRenderingContext2D, log }
}

function label(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'name' in value) return String(value.name)
  return String(value)
}

const picture = (name: string, width = 1920, height = 1080): Picture => ({ name, width, height }) as unknown as Picture

describe('drawStrip', () => {
  it('draws the shots in their slots with the filter, then the frame on top, then the text', () => {
    const { context, log } = recordingContext()
    drawStrip(context, {
      shots: [picture('shot1'), picture('shot2')],
      filterCss: 'grayscale(1)',
      grain: 0,
      grainTile: null,
      frame: picture('frame', 600, 1800),
      caption: 'Knowing Christ More!',
      caption2: 'JTFFC Batangas City',
      dateText: 'Oct 7, 2026',
    })
    const [first, second] = stripSlots(2)
    const shot1 = log.findIndex((entry) => entry.startsWith('drawImage(shot1'))
    const shot2 = log.findIndex((entry) => entry.startsWith('drawImage(shot2'))
    const frame = log.indexOf(`drawImage(frame, 0, 0, ${STRIP.width}, ${STRIP.height})`)
    const date = log.findIndex((entry) => entry.startsWith('fillText(Oct 7, 2026'))
    const caption = log.findIndex((entry) => entry.startsWith('fillText(Knowing Christ More!'))
    const caption2 = log.findIndex((entry) => entry.startsWith('fillText(JTFFC Batangas City'))
    expect(log[0]).toBe('fillStyle=#ffffff')
    expect(log.slice(0, shot1)).toContain('filter=grayscale(1)')
    expect(log[shot1]).toMatch(new RegExp(`, ${first.x}, ${first.y}, ${first.width}, ${first.height}\\)$`))
    expect(log[shot2]).toMatch(new RegExp(`, ${second.x}, ${second.y}, ${second.width}, ${second.height}\\)$`))
    // The filter is reset before the frame, so frames keep their own colours.
    expect(log.slice(shot2, frame)).toContain('restore()')
    // Under the frame: the date, then the two lines under it, top to bottom.
    expect([shot1 < shot2, shot2 < frame, frame < date, date < caption, caption < caption2]).toEqual([true, true, true, true, true])
    expect(log[date]).toContain(`, ${STRIP.dateY}, `)
    expect(log[caption]).toContain(`, ${STRIP.captionY}, `)
    expect(log[caption2]).toContain(`, ${STRIP.caption2Y}, `)
    expect(STRIP.dateY < STRIP.captionY && STRIP.captionY < STRIP.caption2Y).toBe(true)
    expect(log).not.toContain('createPattern(undefined, repeat)')
  })

  it('adds grain over each shot and leaves out empty text and a missing frame', () => {
    const { context, log } = recordingContext()
    drawStrip(context, {
      shots: [picture('shot1'), picture('shot2'), picture('shot3')],
      filterCss: 'none',
      grain: 0.25,
      grainTile: picture('grain', 128, 128) as unknown as HTMLCanvasElement,
      frame: null,
      caption: '',
      caption2: '',
      dateText: '',
    })
    expect(log.filter((entry) => entry === 'globalAlpha=0.25')).toHaveLength(3)
    expect(log.filter((entry) => entry.startsWith('fillText'))).toEqual([])
    expect(log.filter((entry) => entry.startsWith('drawImage'))).toHaveLength(3)
  })
})
