import { useCallback, useEffect, useState } from 'react'

export type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

// Loads data for an admin tab. reload() fetches it again after a change.
export function useLoad<T>(load: () => Promise<T>): { state: Loaded<T>; reload: () => void } {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data })
      },
      (error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [load, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { state, reload }
}

// Runs an admin action and reports its error, so every button handles failure the same way.
export function useAction(onDone: () => void): { run: (action: () => Promise<unknown>) => Promise<void>; error: string | null } {
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setError(null)
      try {
        await action()
        onDone()
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Something went wrong')
      }
    },
    [onDone],
  )
  return { run, error }
}
