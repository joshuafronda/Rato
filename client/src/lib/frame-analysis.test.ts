import { describe, expect, it } from 'vitest'
import { findPhotoWindows, frameLayout, textAreaIsClear } from './frame-analysis.ts'

// A 600x1800 RGBA image that is opaque except for the given see-through rectangles.
function frameWith(holes: Array<[number, number, number, number]>) {
  const width = 600
  const height = 1800
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (const [x, y, w, h] of holes) {
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) data[(row * width + col) * 4 + 3] = 0
    }
  }
  return { width, height, data }
}

describe('findPhotoWindows', () => {
  it('finds each see-through window, top to bottom, covering the hole fully', () => {
    const holes: Array<[number, number, number, number]> = [
      [19, 1124, 563, 394],
      [19, 216, 563, 394],
      [19, 631, 563, 394],
    ]
    const windows = findPhotoWindows(frameWith(holes))
    expect(windows).toHaveLength(3)
    const sorted = [...holes].sort((a, b) => a[1] - b[1])
    windows.forEach((window, i) => {
      const [x, y, w, h] = sorted[i]
      expect(window.x).toBeLessThanOrEqual(x)
      expect(window.y).toBeLessThanOrEqual(y)
      expect(window.x + window.width).toBeGreaterThanOrEqual(x + w)
      expect(window.y + window.height).toBeGreaterThanOrEqual(y + h)
      // Never more than a few pixels bigger than the hole; the frame hides the rest.
      expect(window.width - w).toBeLessThanOrEqual(8)
      expect(window.height - h).toBeLessThanOrEqual(8)
    })
  })

  it('ignores specks and see-through areas touching the edge', () => {
    const windows = findPhotoWindows(
      frameWith([
        [100, 100, 6, 6],
        [0, 1700, 600, 100],
        [50, 300, 500, 400],
      ]),
    )
    expect(windows).toHaveLength(1)
  })

  it('finds nothing in a fully opaque image', () => {
    expect(findPhotoWindows(frameWith([]))).toEqual([])
  })

  it('scales a bigger image to strip coordinates', () => {
    const width = 1200
    const height = 3600
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    for (let row = 400; row < 1200; row += 1) {
      for (let col = 100; col < 1100; col += 1) data[(row * width + col) * 4 + 3] = 0
    }
    const [window] = findPhotoWindows({ width, height, data })
    expect(window.x).toBeLessThanOrEqual(50)
    expect(window.y).toBeLessThanOrEqual(200)
    expect(window.x + window.width).toBeGreaterThanOrEqual(550)
  })
})

describe('textAreaIsClear', () => {
  it('is clear when the caption area is see-through or light', () => {
    expect(textAreaIsClear(frameWith([[0, 1500, 600, 300]]))).toBe(true) // see-through footer
    expect(textAreaIsClear(frameWith([]))).toBe(true) // white (255) everywhere
  })

  it('is not clear when the frame has its own artwork there', () => {
    const dark = frameWith([])
    for (let i = 0; i < dark.data.length; i += 4) {
      dark.data[i] = 20
      dark.data[i + 1] = 40
      dark.data[i + 2] = 80
    }
    expect(textAreaIsClear(dark)).toBe(false)
  })
})

describe('frameLayout', () => {
  const standard = { slots: null, showText: true }

  it("uses the frame's own windows when they match the photo count", () => {
    const frame = frameWith([
      [19, 216, 563, 394],
      [19, 631, 563, 394],
      [19, 1124, 563, 394],
    ])
    const layout = frameLayout(frame, 3)
    expect(layout.slots).toHaveLength(3)
    expect(layout.slots?.[1].y).toBeLessThanOrEqual(631)
  })

  it('keeps the standard holes when the windows do not match', () => {
    // One big see-through area (like the built-in frames): not 3 windows.
    expect(frameLayout(frameWith([[30, 30, 540, 1500]]), 3)).toMatchObject({ slots: null })
    expect(frameLayout(frameWith([]), 2)).toEqual(standard)
  })

  it('leaves out the text when the caption area is covered by artwork', () => {
    const frame = frameWith([[19, 216, 563, 394]])
    for (let y = 1560; y < 1760; y += 1) {
      for (let x = 0; x < 600; x += 1) frame.data[(y * 600 + x) * 4] = 0
    }
    expect(frameLayout(frame, 1).showText).toBe(false)
  })
})
