import { describe, expect, it } from 'vitest'
import { boothIdFrom, parsePort } from '../config.ts'

describe('parsePort', () => {
  it('defaults to 3000 when PORT is unset or empty', () => {
    expect(parsePort(undefined)).toBe(3000)
    expect(parsePort('')).toBe(3000)
  })

  it('accepts a valid port', () => {
    expect(parsePort('3100')).toBe(3100)
  })

  it.each(['abc', '0', '70000', '30.5', '0x0BB8', '3e3', ' 3000 '])('refuses %s with a clear message', (value) => {
    expect(() => parsePort(value)).toThrow(/PORT must be a whole number/)
  })
})

describe('boothIdFrom', () => {
  it('uses BOOTH_ID, else the computer name, as a safe folder name', () => {
    expect(boothIdFrom('lobby', 'DESKTOP-ABC')).toBe('lobby')
    expect(boothIdFrom(undefined, 'DESKTOP-ABC_12')).toBe('desktop-abc-12')
    expect(boothIdFrom('', 'Joshua’s Laptop')).toBe('joshua-s-laptop')
    expect(boothIdFrom('../../x', 'pc')).toBe('x')
    expect(boothIdFrom(undefined, '***')).toBe('booth')
    expect(boothIdFrom('a'.repeat(50), 'pc')).toHaveLength(32)
  })
})
