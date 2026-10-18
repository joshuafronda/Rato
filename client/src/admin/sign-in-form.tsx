import { useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Chip } from '../ui/chip.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'

type Mode = 'login' | 'create'

interface SignInFormProps {
  /** Opens on "Create an account" when there is no account yet. */
  firstRun: boolean
  onSignedIn: () => void
}

// The admin entry page: sign in, or create an account (on the booth laptop only).
export function SignInForm({ firstRun, onSignedIn }: SignInFormProps) {
  const [mode, setMode] = useState<Mode>(firstRun ? 'create' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchTo = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await (mode === 'create' ? adminApi.createAccount(username, password) : adminApi.login(username, password))
      onSignedIn()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="admin-form">
      <div className="button-row auth-tabs" role="group" aria-label="Account">
        <Chip selected={mode === 'login'} onClick={() => switchTo('login')}>
          Sign in
        </Chip>
        <Chip selected={mode === 'create'} onClick={() => switchTo('create')}>
          Create an account
        </Chip>
      </div>
      <form className="card-form" onSubmit={submit}>
        <h2>{mode === 'create' ? 'Create an account' : 'Sign in'}</h2>
        {mode === 'create' && (
          <p className="caption">
            Do this on the booth laptop at http://localhost:3000/admin. Choose a username and a password of at least 8
            characters. After that you can sign in from any device.
          </p>
        )}
        <label className="field">
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" disabled={busy}>
          {mode === 'create' ? 'Create account' : 'Sign in'}
        </Button>
      </form>
    </Card>
  )
}
