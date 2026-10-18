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
      <LoadState state={state}>
        {(status) => {
          if (status.setupNeeded) return <AdminTitle><SignInForm mode="setup" onSignedIn={reload} /></AdminTitle>
          if (!status.username) return <AdminTitle><SignInForm mode="login" onSignedIn={reload} /></AdminTitle>
          return <Dashboard username={status.username} onSignedOut={reload} />
        }}
      </LoadState>
    </main>
  )
}

function AdminTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Rato admin
      </h1>
      {children}
    </>
  )
}
