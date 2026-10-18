import { useCallback, useState } from 'react'
import { type AdminFrame, type AdminLayout, adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { List, ListRow } from '../ui/list-row.tsx'
import { Toggle } from '../ui/toggle.tsx'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

export function FramesTab() {
  const { state, reload } = useLoad(
    useCallback(async () => ({ layouts: await adminApi.layouts(), frames: await adminApi.frames() }), []),
  )
  const { run, error } = useAction(reload)

  return (
    <LoadState state={state}>
      {({ layouts, frames }) => (
        <div className="admin-grid">
          <UploadFrame layouts={layouts} onUploaded={reload} />
          <ActionError error={error} />
          {layouts.map((layout) => (
            <LayoutSection
              key={layout.id}
              layout={layout}
              frames={frames.filter((frame) => frame.layoutId === layout.id)}
              run={run}
            />
          ))}
        </div>
      )}
    </LoadState>
  )
}

interface LayoutSectionProps {
  layout: AdminLayout
  frames: AdminFrame[]
  run: (action: () => Promise<unknown>) => Promise<void>
}

function LayoutSection({ layout, frames, run }: LayoutSectionProps) {
  const move = (index: number, by: number) => {
    const ids = frames.map((frame) => frame.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(index + by, 0, moved)
    void run(() => adminApi.reorderFrames(layout.id, ids))
  }

  return (
    <Card label={layout.name} title={layout.name}>
      <Toggle
        label={`Offered to guests · ${layout.shots} photos`}
        checked={layout.active}
        onChange={(event) => void run(() => adminApi.setLayoutActive(layout.id, event.target.checked))}
      />
      <List>
        {frames.map((frame, index) => (
          <ListRow key={frame.id} leading={<img className="frame-mini" src={frame.imageUrl} alt="" />} title={frame.name}>
            <Toggle
              label="On"
              checked={frame.active}
              onChange={(event) => void run(() => adminApi.updateFrame(frame.id, { active: event.target.checked }))}
            />
            <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
              Up
            </Button>
            <Button variant="secondary" size="sm" disabled={index === frames.length - 1} onClick={() => move(index, 1)}>
              Down
            </Button>
          </ListRow>
        ))}
      </List>
    </Card>
  )
}

function UploadFrame({ layouts, onUploaded }: { layouts: AdminLayout[]; onUploaded: () => void }) {
  const [layoutId, setLayoutId] = useState(layouts[0]?.id ?? 0)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const { run, error } = useAction(onUploaded)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    const form = event.currentTarget as HTMLFormElement
    void run(async () => {
      await adminApi.uploadFrame(layoutId, name, file)
      setName('')
      setFile(null)
      form.reset()
    })
  }

  return (
    <Card title="Add a frame" label="Add a frame">
      <form className="card-form" onSubmit={submit}>
        <p className="caption">
          A PNG of 600 × 1800 pixels with see-through holes where the photos go. Leave the bottom free for the date and
          caption.
        </p>
        <label className="field">
          Layout
          <select value={layoutId} onChange={(event) => setLayoutId(Number(event.target.value))}>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
        </label>
        <label className="field">
          Image (PNG)
          <input type="file" accept="image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
        </label>
        <ActionError error={error} />
        <Button type="submit" icon="frame">
          Upload frame
        </Button>
      </form>
    </Card>
  )
}
