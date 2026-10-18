// A 2x6 inch strip at 300 dpi. The starter frames in server/assets/frames match this size:
// a 30px border, and a footer below the shots for the caption and date.
export const STRIP = {
  width: 600,
  height: 1800,
  inset: 50,
  gap: 20,
  footerTop: 1550,
  // Footer text, top to bottom: the date, the caption, the second caption line.
  dateY: 1612,
  captionY: 1660,
  caption2Y: 1708,
  textMaxWidth: 360,
} as const

export interface Slot {
  x: number
  y: number
  width: number
  height: number
}

export interface Crop {
  sx: number
  sy: number
  sw: number
  sh: number
}

// Where each shot goes on a vertical strip, top to bottom.
export function stripSlots(shots: number): Slot[] {
  if (!Number.isInteger(shots) || shots < 2 || shots > 4) throw new Error(`A strip holds 2 to 4 shots, not ${shots}`)
  const width = STRIP.width - 2 * STRIP.inset
  const space = STRIP.footerTop - 2 * STRIP.inset - (shots - 1) * STRIP.gap
  const height = Math.floor(space / shots)
  return Array.from({ length: shots }, (_, i) => ({
    x: STRIP.inset,
    y: STRIP.inset + i * (height + STRIP.gap),
    width,
    height,
  }))
}

// The centred part of a source image with the slot's shape, so the shot fills the slot
// without stretching.
export function coverCrop(sourceWidth: number, sourceHeight: number, slotWidth: number, slotHeight: number): Crop {
  const scale = Math.min(sourceWidth / slotWidth, sourceHeight / slotHeight)
  const sw = Math.round(slotWidth * scale)
  const sh = Math.round(slotHeight * scale)
  return { sx: Math.round((sourceWidth - sw) / 2), sy: Math.round((sourceHeight - sh) / 2), sw, sh }
}
