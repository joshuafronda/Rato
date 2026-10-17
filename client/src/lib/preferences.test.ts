import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearPreference, readPreference, writePreference } from './preferences.ts'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

function blockedStorage() {
  const blocked = () => {
    throw new DOMException('blocked', 'SecurityError')
  }
  return { getItem: blocked, setItem: blocked, removeItem: blocked }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('preferences', () => {
  it('stores, reads and clears a value', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    writePreference('cameraId', 'cam-2')
    expect(readPreference('cameraId')).toBe('cam-2')
    clearPreference('cameraId')
    expect(readPreference('cameraId')).toBeNull()
  })

  it('falls back silently when storage is blocked', () => {
    vi.stubGlobal('localStorage', blockedStorage())
    expect(() => writePreference('cameraId', 'cam-2')).not.toThrow()
    expect(() => clearPreference('cameraId')).not.toThrow()
    expect(readPreference('cameraId')).toBeNull()
  })
})
