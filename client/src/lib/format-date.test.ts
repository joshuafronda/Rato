import { describe, expect, it } from 'vitest'
import { formatDate } from './format-date.ts'

const date = new Date(2026, 9, 7) // 7 October 2026

describe('formatDate', () => {
  it.each([
    ['MMM d, yyyy', 'Oct 7, 2026'],
    ['MMMM d, yyyy', 'October 7, 2026'],
    ['dd/MM/yy', '07/10/26'],
    ['d.M.yyyy', '7.10.2026'],
    ['', ''],
  ])('formats %j as %j', (format, expected) => {
    expect(formatDate(date, format)).toBe(expected)
  })
})
