import { useEffect, useRef, useState } from 'react'
import { type FrameStyle, drawFrame, isHexColor, renderFramePng } from '../composer/frame-designer.ts'
import { type AdminLayout, adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Chip } from '../ui/chip.tsx'
import { ActionError } from './loading.tsx'
import { useAction } from './use-load.ts'

const SWATCHES = [
  ['Leaf', '#9bc45a'],
  ['Navy', '#14284f'],
  ['Pink', '#ff5c8a'],
  ['Gold', '#c9a96e'],
  ['Sky', '#4aa3df'],
  ['Lavender', '#a78bfa'],
  ['Red', '#e63946'],
  ['Black', '#1c1a21'],
  ['White', '#ffffff'],
] as const

const STYLES: ReadonlyArray<[FrameStyle, string]> = [
  ['solid', 'Solid'],
  ['outline', 'Outline'],
  ['confetti', 'Confetti'],
]

const ALL_LAYOUTS = 'all'

// Make a frame without an image editor: pick a colour and a style, see it live, save it for
// one layout or all of them. It is saved as a PNG like an uploaded frame.
export function FrameDesignerCard({ layouts, onSaved }: { layouts: AdminLayout[]; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(SWATCHES[0][1])
  const [style, setStyle] = useState<FrameStyle>('solid')
  const [target, setTarget] = useState<string>(ALL_LAYOUTS)
  const [saved, setSaved] = useState<string | null>(null)
  const { run, error } = useAction(onSaved)
  const previewRef = useRef<HTMLCanvasElement>(null)

  const chosen = target === ALL_LAYOUTS ? layouts : layouts.filter((layout) => String(layout.id) === target)
  // The preview shows the layout with the most photos, the busiest frame.
  const previewShots = Math.max(...chosen.map((layout) => layout.shots), 2)

  useEffect(() => {
    const context = previewRef.current?.getContext('2d')
    if (!context || !isHexColor(color)) return
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    drawFrame(context, { shots: previewShots, color, style })
  }, [previewShots, color, style])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(null)
    void run(async () => {
      for (const layout of chosen) {
        const png = await renderFramePng({ shots: layout.shots, color, style })
        await adminApi.uploadFrame(layout.id, name, png)
      }
      setSaved(`Saved “${name}” for ${chosen.length === 1 ? chosen[0].name : 'every layout'}.`)
      setName('')
    })
  }

  return (
    <Card title="Design a frame" label="Design a frame">
      <form className="designer" onSubmit={save}>
        <div className="card-form">
          <label className="field">
            Frame name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
          </label>
          <div className="field">
            Colour
            <div className="swatches" role="group" aria-label="Colours">
              {SWATCHES.map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  className="swatch"
                  style={{ background: value }}
                  aria-label={label}
                  aria-pressed={color.toLowerCase() === value}
                  onClick={() => setColor(value)}
                />
              ))}
              <label className="swatch swatch-custom" title="Any colour">
                <input type="color" aria-label="Any colour" value={color} onChange={(event) => setColor(event.target.value)} />
              </label>
            </div>
          </div>
          <div className="field">
            Style
            <div className="button-row auth-tabs" role="group" aria-label="Style">
              {STYLES.map(([value, label]) => (
                <Chip key={value} selected={style === value} onClick={() => setStyle(value)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <label className="field">
            For
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value={ALL_LAYOUTS}>All layouts</option>
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </label>
          <ActionError error={error} />
          {saved && <p className="caption">{saved}</p>}
          <Button type="submit" icon="frame" disabled={chosen.length === 0}>
            Save frame
          </Button>
        </div>
        <canvas ref={previewRef} className="designer-preview" width={600} height={1800} aria-label="Frame preview" role="img" />
      </form>
    </Card>
  )
}
