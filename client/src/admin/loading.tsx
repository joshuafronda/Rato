import { ErrorBanner } from '../ui/error-banner.tsx'
import type { Loaded } from './use-load.ts'

// The loading and error states every admin tab shows the same way.
export function LoadState<T>({ state, children }: { state: Loaded<T>; children: (data: T) => React.ReactNode }) {
  if (state.status === 'loading') return <p className="page-note">Loading…</p>
  if (state.status === 'error') return <ErrorBanner message={state.message} />
  return <>{children(state.data)}</>
}

export function ActionError({ error }: { error: string | null }) {
  return error ? <ErrorBanner message={error} /> : null
}
