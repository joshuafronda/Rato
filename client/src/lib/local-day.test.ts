import { describe, expect, it } from 'vitest'
import { dayLabel, localDay } from './local-day.ts'

describe('localDay', () => {
  it('uses the local date with zero padding', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('labels a day for people', () => {
    expect(dayLabel('2026-10-18')).toBe('Sun, Oct 18')
  })
})
