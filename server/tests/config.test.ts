import { describe, expect, it } from 'vitest'
import { parsePort } from '../config.ts'

describe('parsePort', () => {
  it('defaults to 3000 when PORT is unset or empty', () => {
    expect(parsePort(undefined)).toBe(3000)
    expect(parsePort('')).toBe(3000)
  })

  it('accepts a valid port', () => {
    expect(parsePort('3100')).toBe(3100)
  })

  it.each(['abc', '0', '70000', '30.5'])('refuses %s with a clear message', (value) => {
    expect(() => parsePort(value)).toThrow(/PORT must be a whole number/)
  })
})
