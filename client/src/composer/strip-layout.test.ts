import { describe, expect, it } from 'vitest'
import { STRIP, coverCrop, stripSlots } from './strip-layout.ts'

describe('stripSlots', () => {
  it.each([2, 3, 4])('stacks %i equal shots inside the strip, above the footer', (shots) => {
    const slots = stripSlots(shots)
    expect(slots).toHaveLength(shots)
    for (const slot of slots) {
      expect(slot.x).toBe(slots[0].x)
      expect(slot.width).toBe(slots[0].width)
      expect(slot.height).toBe(slots[0].height)
      expect(slot.x + slot.width).toBeLessThanOrEqual(STRIP.width)
    }
    const last = slots[shots - 1]
    expect(last.y + last.height).toBeLessThanOrEqual(STRIP.footerTop)
    // In order, with a gap and no overlap.
    for (let i = 1; i < shots; i += 1) expect(slots[i].y).toBeGreaterThan(slots[i - 1].y + slots[i - 1].height)
  })

  it('rejects shot counts the strip cannot hold', () => {
    expect(() => stripSlots(1)).toThrow()
    expect(() => stripSlots(5)).toThrow()
  })
})

describe('coverCrop', () => {
  it('crops the sides of a wide shot to fill a squarer slot, centred', () => {
    expect(coverCrop(1920, 1080, 500, 500)).toEqual({ sx: 420, sy: 0, sw: 1080, sh: 1080 })
  })

  it('crops the top and bottom of a tall shot', () => {
    expect(coverCrop(1000, 2000, 500, 250)).toEqual({ sx: 0, sy: 750, sw: 1000, sh: 500 })
  })

  it('keeps a shot that already fits', () => {
    expect(coverCrop(800, 600, 400, 300)).toEqual({ sx: 0, sy: 0, sw: 800, sh: 600 })
  })
})
