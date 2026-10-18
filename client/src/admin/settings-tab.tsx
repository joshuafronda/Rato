import { useCallback, useState } from 'react'
import { type AdminSettings, adminApi } from '../lib/admin-api.ts'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

export function SettingsTab() {
  const { state } = useLoad(useCallback(() => adminApi.settings(), []))

  return (
    <LoadState state={state}>
      {(settings) => (
        <>
          <SettingsForm saved={settings} />
          <Backup />
        </>
      )}
    </LoadState>
  )
}

const noop = () => {}

function SettingsForm({ saved }: { saved: AdminSettings }) {
  const [form, setForm] = useState(saved)
  const [done, setDone] = useState(false)
  const { run, error } = useAction(noop)
  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setDone(false)
    setForm({ ...form, [key]: value })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      setForm(await adminApi.saveSettings(form))
      setDone(true)
    })
  }

  return (
    <form className="admin-section admin-form" onSubmit={submit} aria-label="Settings">
      <h2>Settings</h2>
      <label>
        Countdown (seconds)
        <input
          type="number"
          min={1}
          max={10}
          value={form.countdownSeconds}
          onChange={(event) => set('countdownSeconds', Number(event.target.value))}
        />
      </label>
      <label>
        Caption on the strip
        <input value={form.captionText} maxLength={40} onChange={(event) => set('captionText', event.target.value)} />
      </label>
      <label>
        Date format (e.g. MMM d, yyyy or dd/MM/yyyy; empty = no date)
        <input value={form.dateFormat} maxLength={30} onChange={(event) => set('dateFormat', event.target.value)} />
      </label>
      <label>
        Print paper
        <select value={form.printPaper} onChange={(event) => set('printPaper', event.target.value as AdminSettings['printPaper'])}>
          <option value="4x6">4×6 photo paper (two strips, cut in half)</option>
          <option value="2x6">2×6 strip paper</option>
        </select>
      </label>
      <label>
        Printer (a note for you; the booth prints to the Windows default printer)
        <input value={form.printer} maxLength={100} onChange={(event) => set('printer', event.target.value)} />
      </label>
      <label className="toggle">
        <input type="checkbox" checked={form.galleryEnabled} onChange={(event) => set('galleryEnabled', event.target.checked)} />
        Gallery on
      </label>
      <label>
        Auto-delete strips after (days, 0 = never)
        <input
          type="number"
          min={0}
          max={365}
          value={form.autoDeleteDays}
          onChange={(event) => set('autoDeleteDays', Number(event.target.value))}
        />
      </label>
      <ActionError error={error} />
      {done && <p className="page-note">Saved.</p>}
      <button type="submit">Save settings</button>
    </form>
  )
}

function Backup() {
  const [path, setPath] = useState<string | null>(null)
  const { run, error } = useAction(noop)

  return (
    <section className="admin-section" aria-label="Backup">
      <h2>Backup</h2>
      <p className="page-note">
        Copies the database, photos, strips and frames into a new folder on the laptop. Copy that folder to a USB drive
        to keep it safe.
      </p>
      <button type="button" onClick={() => void run(async () => setPath((await adminApi.backup()).path))}>
        Back up now
      </button>
      <ActionError error={error} />
      {path && <p>Saved to {path}</p>}
    </section>
  )
}
