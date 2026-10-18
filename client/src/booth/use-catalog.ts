import { useCallback, useEffect, useState } from 'react'
import { getBoothSettings, getFilters, getFrames, getLayouts } from '../lib/api.ts'
import type { BoothSettings, Filter, Frame, Layout } from '../lib/booth-types.ts'

export type Catalog =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; layouts: Layout[]; filters: Filter[]; settings: BoothSettings }

// Loads the guest choices once when the booth opens. retry() loads them again.
export function useCatalog(): { catalog: Catalog; retry: () => void } {
  const [catalog, setCatalog] = useState<Catalog>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getLayouts(), getFilters(), getBoothSettings()]).then(
      ([layouts, filters, settings]) => {
        if (!cancelled) setCatalog({ status: 'ready', layouts, filters, settings })
      },
      (error: Error) => {
        if (!cancelled) setCatalog({ status: 'error', message: error.message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setCatalog({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { catalog, retry }
}

export type FrameList = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; frames: Frame[] }

// The active frames for one layout.
export function useFrames(layoutId: number): FrameList {
  const [result, setResult] = useState<{ layoutId: number; list: FrameList } | null>(null)

  useEffect(() => {
    let cancelled = false
    getFrames(layoutId).then(
      (frames) => {
        if (!cancelled) setResult({ layoutId, list: { status: 'ready', frames } })
      },
      (error: Error) => {
        if (!cancelled) setResult({ layoutId, list: { status: 'error', message: error.message } })
      },
    )
    return () => {
      cancelled = true
    }
  }, [layoutId])

  // A result for an earlier layout is stale.
  return result?.layoutId === layoutId ? result.list : { status: 'loading' }
}
