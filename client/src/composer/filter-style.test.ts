import { describe, expect, it } from 'vitest'
import { filterCss, grainAmount } from './filter-style.ts'

describe('filterCss', () => {
  it('is none for the natural filter', () => {
    expect(filterCss({})).toBe('none')
  })

  it('turns params into a CSS filter in a fixed order, with units', () => {
    expect(filterCss({ blur: 0.4, hueRotate: -10, brightness: 1.08, contrast: 0.92 })).toBe(
      'brightness(1.08) contrast(0.92) hue-rotate(-10deg) blur(0.4px)',
    )
    expect(filterCss({ grayscale: 1, sepia: 0.2, saturate: 1.2 })).toBe('saturate(1.2) grayscale(1) sepia(0.2)')
  })

  it('ignores grain and unknown keys', () => {
    expect(filterCss({ grain: 0.25, vignette: 1 })).toBe('none')
  })
})

describe('grainAmount', () => {
  it('is 0 without grain and clamped to 0..1', () => {
    expect(grainAmount({})).toBe(0)
    expect(grainAmount({ grain: 0.25 })).toBe(0.25)
    expect(grainAmount({ grain: 4 })).toBe(1)
    expect(grainAmount({ grain: -1 })).toBe(0)
  })
})
