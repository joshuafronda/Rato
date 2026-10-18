import { describe, expect, it } from 'vitest'
import { boothAnyDeviceFrom, boothIdFrom, parsePort } from '../config.ts'

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

describe('boothAnyDeviceFrom', () => {
  it('is on only for the word true, in any case', () => {
    expect(boothAnyDeviceFrom('true')).toBe(true)
    expect(boothAnyDeviceFrom('TRUE')).toBe(true)
    expect(boothAnyDeviceFrom(undefined)).toBe(false)
    expect(boothAnyDeviceFrom('')).toBe(false)
    expect(boothAnyDeviceFrom('yes')).toBe(false)
  })
})

describe('parsePort for HTTPS_PORT', () => {
  it('has its own default and names itself in the error', () => {
    expect(parsePort(undefined, 'HTTPS_PORT', 3443)).toBe(3443)
    expect(parsePort('8443', 'HTTPS_PORT', 3443)).toBe(8443)
    expect(() => parsePort('abc', 'HTTPS_PORT', 3443)).toThrow(/HTTPS_PORT must be a whole number/)
  })
})
