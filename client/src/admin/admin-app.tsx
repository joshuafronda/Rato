import { useCallback } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Dashboard } from './dashboard.tsx'
import { LoadState } from './loading.tsx'
import { SignInForm } from './sign-in-form.tsx'
import { useLoad } from './use-load.ts'

// The admin site at /admin: first-run setup, sign-in, then the dashboard.
export function AdminApp() {
  const { state, reload } = useLoad(useCallback(() => adminApi.status(), []))

  return (
    <main className="page admin">
      <h1>Rato admin</h1>
      <LoadState state={state}>
        {(status) => {
          if (status.setupNeeded) return <SignInForm mode="setup" onSignedIn={reload} />
          if (!status.username) return <SignInForm mode="login" onSignedIn={reload} />
          return <Dashboard username={status.username} onSignedOut={reload} />
        }}
      </LoadState>
    </main>
  )
}
