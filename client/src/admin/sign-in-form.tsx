import { useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { ErrorBanner } from '../ui/error-banner.tsx'

interface SignInFormProps {
  mode: 'setup' | 'login'
  onSignedIn: () => void
}

export function SignInForm({ mode, onSignedIn }: SignInFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await (mode === 'setup' ? adminApi.setup(username, password) : adminApi.login(username, password))
      onSignedIn()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="admin-form">
      <form className="card-form" onSubmit={submit}>
        <h2>{mode === 'setup' ? 'Create the admin account' : 'Sign in'}</h2>
        {mode === 'setup' && (
          <p className="caption">
            Do this once, on the booth laptop at http://localhost:3000/admin. Choose any username and a password of at
            least 8 characters.
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
            autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" disabled={busy}>
          {mode === 'setup' ? 'Create account' : 'Sign in'}
        </Button>
      </form>
    </Card>
  )
}
