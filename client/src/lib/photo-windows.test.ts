import { describe, expect, it } from 'vitest'
import { findPhotoWindows } from './photo-windows.ts'

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
