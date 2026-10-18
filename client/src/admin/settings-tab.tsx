import { useCallback, useState } from 'react'
import { type AdminSettings, adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Toggle } from '../ui/toggle.tsx'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

export function SettingsTab() {
  const { state } = useLoad(useCallback(() => adminApi.settings(), []))

  return (
    <LoadState state={state}>
      {(settings) => (
        <div className="admin-grid">
          <SettingsForm saved={settings} />
          <Backup />
        </div>
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
    <Card title="Settings" label="Settings">
      <form className="card-form" onSubmit={submit}>
      <label className="field">
        Countdown (seconds)
        <input
          type="number"
          min={1}
          max={10}
          value={form.countdownSeconds}
          onChange={(event) => set('countdownSeconds', Number(event.target.value))}
        />
      </label>
      <label className="field">
        Line under the date (bold)
        <input value={form.captionText} maxLength={40} onChange={(event) => set('captionText', event.target.value)} />
      </label>
      <label className="field">
        Second line
        <input value={form.captionLine2} maxLength={40} onChange={(event) => set('captionLine2', event.target.value)} />
      </label>
      <label className="field">
        Date format (e.g. MMM d, yyyy or dd/MM/yyyy; empty = no date)
        <input value={form.dateFormat} maxLength={30} onChange={(event) => set('dateFormat', event.target.value)} />
      </label>
      <label className="field">
        Print paper
        <select value={form.printPaper} onChange={(event) => set('printPaper', event.target.value as AdminSettings['printPaper'])}>
          <option value="4x6">4×6 photo paper (two strips, cut in half)</option>
          <option value="2x6">2×6 strip paper</option>
          <option value="A4">A4 paper (five strips, sideways)</option>
        </select>
      </label>
      <label className="field">
        Printer (a note for you; the booth prints to the Windows default printer)
        <input value={form.printer} maxLength={100} onChange={(event) => set('printer', event.target.value)} />
      </label>
      <Toggle label="Gallery on" checked={form.galleryEnabled} onChange={(event) => set('galleryEnabled', event.target.checked)} />
      <label className="field">
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
      {done && <p className="caption">Saved.</p>}
      <Button type="submit">Save settings</Button>
      </form>
    </Card>
  )
}

function Backup() {
  const [path, setPath] = useState<string | null>(null)
  const { run, error } = useAction(noop)

  return (
    <Card title="Backup" label="Backup">
      <p className="caption">
        Copies the database, photos, strips and frames into a new folder on the laptop. Copy that folder to a USB drive
        to keep it safe.
      </p>
      <Button icon="download" onClick={() => void run(async () => setPath((await adminApi.backup()).path))}>
        Back up now
      </Button>
      <ActionError error={error} />
      {path && <p className="caption">Saved to {path}</p>}
    </Card>
  )
}
