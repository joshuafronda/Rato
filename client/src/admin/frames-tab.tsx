import { useCallback, useState } from 'react'
import { type AdminFrame, type AdminLayout, adminApi } from '../lib/admin-api.ts'
import { type PhotoWindow, photoWindowsOf } from '../lib/frame-analysis.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { List, ListRow } from '../ui/list-row.tsx'
import { Toggle } from '../ui/toggle.tsx'
import { FrameDesignerCard } from './frame-designer-card.tsx'
import { FrameName } from './frame-name.tsx'
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
          <FrameDesignerCard layouts={layouts} onSaved={reload} />
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
  const remove = (frame: AdminFrame) => {
    const message = `Delete the frame "${frame.name}"? Guests will no longer see it. Strips already made with it stay as they are.`
    if (window.confirm(message)) void run(() => adminApi.deleteFrame(frame.id))
  }

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
          <ListRow
            key={frame.id}
            leading={<img className="frame-mini" src={frame.imageUrl} alt="" />}
            title={<FrameName frame={frame} run={run} />}
          >
            <Toggle
              label="On"
              checked={frame.active}
              onChange={(event) => void run(() => adminApi.updateFrame(frame.id, { active: event.target.checked }))}
            />
            <Toggle
              label="Date & captions"
              checked={frame.showText}
              onChange={(event) => void run(() => adminApi.updateFrame(frame.id, { showText: event.target.checked }))}
            />
            <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
              Up
            </Button>
            <Button variant="secondary" size="sm" disabled={index === frames.length - 1} onClick={() => move(index, 1)}>
              Down
            </Button>
            <Button variant="destructive" size="sm" aria-label={`Delete ${frame.name}`} onClick={() => remove(frame)}>
              Delete
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
  const [windows, setWindows] = useState<PhotoWindow[]>([])
  const [showText, setShowText] = useState(true)
  const { run, error } = useAction(onUploaded)
  const layout = layouts.find((candidate) => candidate.id === layoutId)

  // Finds the frame's see-through windows as soon as a file is picked. A frame with its own
  // windows usually carries its own text too, so the date and captions start off then.
  const chooseFile = (chosen: File | null) => {
    setFile(chosen)
    setWindows([])
    setShowText(true)
    if (!chosen) return
    void run(async () => {
      const found = await photoWindowsOf(chosen)
      setWindows(found)
      setShowText(found.length === 0)
    })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    const form = event.currentTarget as HTMLFormElement
    void run(async () => {
      const slots = windows.length > 0 ? windows : undefined
      await adminApi.uploadFrame(layoutId, name, file, { slots, showText })
      setName('')
      chooseFile(null)
      form.reset()
    })
  }

  return (
    <Card title="Upload your own frame" label="Upload your own frame">
      <form className="card-form" onSubmit={submit}>
        <p className="caption">
          A PNG of 600 × 1800 pixels (or any 1:3 size) with see-through windows where the photos go, one per photo. The
          photos are placed in your windows, wherever they are.
        </p>
        <label className="field">
          Layout
          <select value={layoutId} onChange={(event) => setLayoutId(Number(event.target.value))}>
            {layouts.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
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
          <input type="file" accept="image/png" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} required />
        </label>
        {file && <WindowsFound found={windows.length} needed={layout?.shots ?? 0} />}
        <Toggle label="Add the date and caption lines" checked={showText} onChange={(event) => setShowText(event.target.checked)} />
        <ActionError error={error} />
        <Button type="submit" icon="frame">
          Upload frame
        </Button>
      </form>
    </Card>
  )
}

function WindowsFound({ found, needed }: { found: number; needed: number }) {
  if (found === 0) return <Badge tone="neutral">No see-through windows found: the standard photo holes are used</Badge>
  if (found === needed) return <Badge tone="success">Found {found} photo windows</Badge>
  return (
    <Badge tone="danger">
      Found {found} photo windows, but this layout takes {needed} photos
    </Badge>
  )
}
