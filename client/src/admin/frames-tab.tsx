import { useCallback, useState } from 'react'
import { type AdminFrame, type AdminLayout, adminApi } from '../lib/admin-api.ts'
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
        <>
          <ActionError error={error} />
          <UploadFrame layouts={layouts} onUploaded={reload} />
          {layouts.map((layout) => (
            <LayoutSection
              key={layout.id}
              layout={layout}
              frames={frames.filter((frame) => frame.layoutId === layout.id)}
              run={run}
            />
          ))}
        </>
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
    <section className="admin-section" aria-label={layout.name}>
      <div className="admin-row">
        <h2>
          {layout.name} ({layout.shots} photos)
        </h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={layout.active}
            onChange={(event) => void run(() => adminApi.setLayoutActive(layout.id, event.target.checked))}
          />
          Offered to guests
        </label>
      </div>
      <ul className="admin-list">
        {frames.map((frame, index) => (
          <li key={frame.id} className="admin-item">
            <img className="admin-frame-thumb" src={frame.imageUrl} alt="" />
            <span className="admin-item-name">{frame.name}</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={frame.active}
                onChange={(event) => void run(() => adminApi.updateFrame(frame.id, { active: event.target.checked }))}
              />
              On
            </label>
            <button type="button" className="secondary-action" disabled={index === 0} onClick={() => move(index, -1)}>
              Up
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={index === frames.length - 1}
              onClick={() => move(index, 1)}
            >
              Down
            </button>
          </li>
        ))}
      </ul>
    </section>
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
    void run(async () => {
      await adminApi.uploadFrame(layoutId, name, file)
      setName('')
      setFile(null)
      ;(event.target as HTMLFormElement).reset()
    })
  }

  return (
    <form className="admin-section admin-form" onSubmit={submit}>
      <h2>Add a frame</h2>
      <p className="page-note">
        A PNG of 600 × 1800 pixels with see-through holes where the photos go. Leave the bottom free for the
        date and caption.
      </p>
      <label>
        Layout
        <select value={layoutId} onChange={(event) => setLayoutId(Number(event.target.value))}>
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
      </label>
      <label>
        Image (PNG)
        <input type="file" accept="image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
      </label>
      <ActionError error={error} />
      <button type="submit">Upload frame</button>
    </form>
  )
}
