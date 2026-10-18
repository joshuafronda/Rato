import { useState } from 'react'
import { type AdminFrame, adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'

interface FrameNameProps {
  frame: AdminFrame
  run: (action: () => Promise<unknown>) => Promise<void>
}

// A frame's name, renamed in place: Edit, type, Save.
export function FrameName({ frame, run }: FrameNameProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(frame.name)

  if (!editing) {
    return (
      <span className="frame-name">
        {frame.name}
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Edit the name of ${frame.name}`}
          onClick={() => {
            setName(frame.name)
            setEditing(true)
          }}
        >
          Edit
        </Button>
      </span>
    )
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      await adminApi.updateFrame(frame.id, { name })
      setEditing(false)
    })
  }

  return (
    <form className="frame-name" onSubmit={save}>
      <input
        aria-label={`New name for ${frame.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={40}
        required
        autoFocus
      />
      <Button type="submit" size="sm">
        Save name
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  )
}
