import { describe, expect, it } from 'vitest'
import { FRAME_LABEL, confettiDots, drawFrame, isHexColor } from './frame-designer.ts'
import { STRIP, stripSlots } from './strip-layout.ts'

// Records every call and property write, like a canvas would receive them.
function recordingContext() {
  const log: string[] = []
  const target = {} as Record<string, unknown>
  const context = new Proxy(target, {
    get(_, key: string) {
      if (key in target) return target[key]
      return (...args: unknown[]) => {
        log.push(`${key}(${args.join(', ')})`)
      }
    },
    set(_, key: string, value) {
      log.push(`${key}=${String(value)}`)
      return true
    },
  })
  return { context: context as unknown as CanvasRenderingContext2D, log }
}

describe('drawFrame', () => {
  it.each([2, 3, 4])('fills the strip with the colour and cuts a hole for each of %i photos', (shots) => {
    const { context, log } = recordingContext()
    drawFrame(context, { shots, color: '#9bc45a', style: 'solid' })
    expect(log.slice(0, 2)).toEqual(['fillStyle=#9bc45a', `fillRect(0, 0, ${STRIP.width}, ${STRIP.height})`])
    const cut = log.indexOf('globalCompositeOperation=destination-out')
    expect(cut).toBeGreaterThan(0)
    for (const slot of stripSlots(shots)) {
      expect(log).toContain(`roundRect(${slot.x}, ${slot.y}, ${slot.width}, ${slot.height}, 14)`)
    }
    // The white label for the caption and date is drawn after the holes.
    const label = log.indexOf(`roundRect(${FRAME_LABEL.x}, ${FRAME_LABEL.y}, ${FRAME_LABEL.width}, ${FRAME_LABEL.height}, ${FRAME_LABEL.radius})`)
    expect(label).toBeGreaterThan(cut)
  })

  it('outlines each photo in the outline style', () => {
    const { context, log } = recordingContext()
    drawFrame(context, { shots: 3, color: '#14284f', style: 'outline' })
    expect(log.filter((entry) => entry === 'stroke()')).toHaveLength(3)
  })

  it('adds confetti in the confetti style', () => {
    const { context, log } = recordingContext()
    drawFrame(context, { shots: 4, color: '#ff5c8a', style: 'confetti' })
    expect(log.filter((entry) => entry.startsWith('arc(')).length).toBeGreaterThan(20)
  })
})

describe('confettiDots', () => {
  it('is the same every time and never covers a photo or the label', () => {
    const dots = confettiDots(4)
    expect(confettiDots(4)).toEqual(dots)
    const boxes = [...stripSlots(4), FRAME_LABEL]
    for (const dot of dots) {
      for (const box of boxes) {
        const inside =
          dot.x + dot.r > box.x && dot.x - dot.r < box.x + box.width && dot.y + dot.r > box.y && dot.y - dot.r < box.y + box.height
        expect(inside).toBe(false)
      }
      expect(dot.x - dot.r).toBeGreaterThanOrEqual(0)
      expect(dot.x + dot.r).toBeLessThanOrEqual(STRIP.width)
    }
  })
})

describe('isHexColor', () => {
  it('accepts #rrggbb only', () => {
    expect(['#9bc45a', '#FFFFFF'].map(isHexColor)).toEqual([true, true])
    expect(['red', '#fff', 'url(x)', '#12345g'].map(isHexColor)).toEqual([false, false, false, false])
  })
})
