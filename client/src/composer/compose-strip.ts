import { canvasToBlob } from '../lib/canvas-to-blob.ts'
import { filterCss, grainAmount } from './filter-style.ts'
import { grainTile } from './grain.ts'
import type { Slot } from '../lib/booth-types.ts'
import { STRIP, coverCrop, stripSlots } from './strip-layout.ts'

/** Anything drawable that knows its own size: an ImageBitmap, a decoded <img>. */
export type Picture = CanvasImageSource & { width: number; height: number }

export interface StripDrawing {
  shots: Picture[]
  filterCss: string
  grain: number
  grainTile: HTMLCanvasElement | null
  frame: Picture | null
  /** Where the photos go: the frame's own windows, or null for the layout's standard holes. */
  slots: Slot[] | null
  caption: string
  caption2: string
  dateText: string
}

export interface StripRequest {
  shots: Blob[]
  filterParams: Record<string, number>
  frameUrl: string | null
  slots: Slot[] | null
  caption: string
  caption2: string
  dateText: string
}

const BACKGROUND = '#ffffff'
const TEXT_COLOR = '#1c1a21'
const FONT = "'Plus Jakarta Sans Variable', system-ui, 'Segoe UI', Roboto, sans-serif"

// Builds the finished strip as a PNG: shots by layout, filter, frame on top, then the date
// and the two caption lines under it.
export async function composeStrip(request: StripRequest): Promise<Blob> {
  await loadFonts()
  const shots = await Promise.all(request.shots.map((shot) => createImageBitmap(shot)))
  try {
    const frame = request.frameUrl ? await loadImage(request.frameUrl) : null
    const canvas = document.createElement('canvas')
    canvas.width = STRIP.width
    canvas.height = STRIP.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    drawStrip(context, {
      shots,
      filterCss: filterCss(request.filterParams),
      grain: grainAmount(request.filterParams),
      grainTile: grainTile(),
      frame,
      slots: request.slots,
      caption: request.caption,
      caption2: request.caption2,
      dateText: request.dateText,
    })
    return await canvasToBlob(canvas, 'image/png')
  } finally {
    for (const shot of shots) shot.close()
  }
}

export function drawStrip(context: CanvasRenderingContext2D, drawing: StripDrawing): void {
  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, STRIP.width, STRIP.height)

  const slots = drawing.slots ?? stripSlots(drawing.shots.length)
  drawing.shots.forEach((shot, i) => {
    const slot = slots[i]
    const { sx, sy, sw, sh } = coverCrop(shot.width, shot.height, slot.width, slot.height)
    context.save()
    context.filter = drawing.filterCss
    context.drawImage(shot, sx, sy, sw, sh, slot.x, slot.y, slot.width, slot.height)
    context.restore()
    if (drawing.grain > 0 && drawing.grainTile) {
      context.save()
      context.globalAlpha = drawing.grain
      context.globalCompositeOperation = 'overlay'
      context.fillStyle = context.createPattern(drawing.grainTile, 'repeat') ?? BACKGROUND
      context.fillRect(slot.x, slot.y, slot.width, slot.height)
      context.restore()
    }
  })

  if (drawing.frame) context.drawImage(drawing.frame, 0, 0, STRIP.width, STRIP.height)

  context.fillStyle = TEXT_COLOR
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  drawText(context, drawing.dateText, `28px ${FONT}`, STRIP.dateY)
  drawText(context, drawing.caption, `bold 38px ${FONT}`, STRIP.captionY)
  drawText(context, drawing.caption2, `26px ${FONT}`, STRIP.caption2Y)
}

// One centred line of footer text; empty text draws nothing.
function drawText(context: CanvasRenderingContext2D, text: string, font: string, y: number): void {
  if (!text) return
  context.font = font
  context.fillText(text, STRIP.width / 2, y, STRIP.textMaxWidth)
}

// Canvas text only uses a web font that is already loaded; otherwise it silently falls
// back to the system font.
async function loadFonts(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`bold 38px ${FONT}`), document.fonts.load(`28px ${FONT}`)])
  } catch {
    // The system font is fine too.
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch (error) {
    throw new Error('The frame image could not be loaded', { cause: error })
  }
  // An SVG without a pixel size decodes as 0x0; draw it at strip size instead.
  if (image.width === 0 || image.height === 0) {
    image.width = STRIP.width
    image.height = STRIP.height
  }
  return image
}
