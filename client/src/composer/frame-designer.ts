import { canvasToBlob } from '../lib/canvas-to-blob.ts'
import { STRIP, type Slot, stripSlots } from './strip-layout.ts'

export type FrameStyle = 'solid' | 'outline' | 'confetti'

export interface FrameDesign {
  shots: number
  /** #rrggbb */
  color: string
  style: FrameStyle
}

// The white label in the footer, behind the caption and date (see STRIP.captionY/dateY),
// so the dark text stays readable on any frame colour.
export const FRAME_LABEL = { x: 110, y: 1580, width: 380, height: 160, radius: 24 } as const

const HOLE_RADIUS = 14
const OUTLINE_GAP = 8
const CONFETTI_COUNT = 70
const CONFETTI_COLORS = ['#ffffff', '#ffd166', '#9bc45a', '#118ab2', '#ff5c8a']

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

// Draws a frame: the colour everywhere except rounded see-through holes where the photos go.
export function drawFrame(context: CanvasRenderingContext2D, design: FrameDesign): void {
  const slots = stripSlots(design.shots)
  context.fillStyle = design.color
  context.fillRect(0, 0, STRIP.width, STRIP.height)

  if (design.style === 'confetti') {
    for (const dot of confettiDots(design.shots)) {
      context.fillStyle = dot.color
      context.beginPath()
      context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      context.fill()
    }
  }

  context.save()
  context.globalCompositeOperation = 'destination-out'
  for (const slot of slots) {
    context.beginPath()
    context.roundRect(slot.x, slot.y, slot.width, slot.height, HOLE_RADIUS)
    context.fill()
  }
  context.restore()

  if (design.style === 'outline') {
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    context.lineWidth = 4
    for (const slot of slots) {
      context.beginPath()
      context.roundRect(
        slot.x - OUTLINE_GAP,
        slot.y - OUTLINE_GAP,
        slot.width + OUTLINE_GAP * 2,
        slot.height + OUTLINE_GAP * 2,
        HOLE_RADIUS + OUTLINE_GAP,
      )
      context.stroke()
    }
  }

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.roundRect(FRAME_LABEL.x, FRAME_LABEL.y, FRAME_LABEL.width, FRAME_LABEL.height, FRAME_LABEL.radius)
  context.fill()
}

// The finished frame as a 600 x 1800 PNG, ready to upload like a hand-made one.
export function renderFramePng(design: FrameDesign): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = STRIP.width
  canvas.height = STRIP.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available')
  drawFrame(context, design)
  return canvasToBlob(canvas, 'image/png')
}

export interface Dot {
  x: number
  y: number
  r: number
  color: string
}

// Confetti in the border and footer, never over a photo or the label. A fixed seed, so a
// frame looks the same in the preview and when saved.
export function confettiDots(shots: number): Dot[] {
  const random = seededRandom(shots * 7919)
  const blocked: Array<Pick<Slot, 'x' | 'y' | 'width' | 'height'>> = [...stripSlots(shots), FRAME_LABEL]
  const dots: Dot[] = []
  for (let tries = 0; dots.length < CONFETTI_COUNT && tries < CONFETTI_COUNT * 50; tries += 1) {
    const r = 4 + random() * 7
    const x = r + random() * (STRIP.width - r * 2)
    const y = r + random() * (STRIP.height - r * 2)
    const clear = blocked.every(
      (box) => x + r <= box.x || x - r >= box.x + box.width || y + r <= box.y || y - r >= box.y + box.height,
    )
    if (clear) dots.push({ x, y, r, color: CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)] })
  }
  return dots
}

// mulberry32: a tiny repeatable random number generator.
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
