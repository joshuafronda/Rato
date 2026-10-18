import { useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'

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
    <form className="admin-form" onSubmit={submit}>
      <h2>{mode === 'setup' ? 'Create the admin account' : 'Sign in'}</h2>
      {mode === 'setup' && (
        <p className="page-note">
          Do this once, on the booth laptop at http://localhost:3000/admin. Choose any username and a password of at
          least 8 characters.
        </p>
      )}
      <label>
        Username
        <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {mode === 'setup' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  )
}
