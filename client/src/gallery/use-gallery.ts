import { useEffect, useState } from 'react'
import { getGallery } from '../lib/api.ts'
import type { Gallery } from '../lib/booth-types.ts'

export type GalleryState = { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & Gallery)

// The shared strips, newest first. `refreshKey` reloads them (e.g. back at the lobby).
export function useGallery(limit?: number, refreshKey: unknown = null): GalleryState {
  const [state, setState] = useState<GalleryState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getGallery(limit).then(
      (gallery) => {
        if (!cancelled) setState({ status: 'ready', ...gallery })
      },
      (error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [limit, refreshKey])

  return state
}
