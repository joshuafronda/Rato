// Per-device conveniences (which camera this booth screen uses). Never required state:
// storage can be blocked, so every read and write falls back silently.
const PREFIX = 'rato.'

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    // Storage blocked: the booth still works, it just forgets the choice.
  }
}

export function clearPreference(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Storage blocked: nothing was stored to clear.
  }
}
