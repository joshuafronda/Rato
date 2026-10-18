import { STRIP } from '../composer/strip-layout.ts'

export interface PhotoWindow {
  x: number
  y: number
  width: number
  height: number
}

export interface Pixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

// The grid the frame is checked on, in strip pixels. Windows are rounded outwards to it, so
// a photo always fills its window; the frame covers the few extra pixels.
const CELL = 4
// Smaller see-through areas (sparkles, gaps in lettering) are not photo windows.
const MIN_AREA = 100 * 100
const SEE_THROUGH = 128

// The see-through windows of a frame image, top to bottom, in 600x1800 strip coordinates.
// Areas touching the image edge are not windows (a frame with a cut-out border).
export function findPhotoWindows(image: Pixels): PhotoWindow[] {
  const columns = Math.floor(STRIP.width / CELL)
  const rows = Math.floor(STRIP.height / CELL)
  const scaleX = image.width / STRIP.width
  const scaleY = image.height / STRIP.height
  const clear = new Uint8Array(columns * rows)
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.floor((column * CELL + CELL / 2) * scaleX)
      const y = Math.floor((row * CELL + CELL / 2) * scaleY)
      clear[row * columns + column] = image.data[(y * image.width + x) * 4 + 3] < SEE_THROUGH ? 1 : 0
    }
  }

  const windows: PhotoWindow[] = []
  const seen = new Uint8Array(columns * rows)
  for (let start = 0; start < clear.length; start += 1) {
    if (!clear[start] || seen[start]) continue
    const area = fillArea(clear, seen, columns, rows, start)
    const touchesEdge = area.left === 0 || area.top === 0 || area.right === columns - 1 || area.bottom === rows - 1
    const window = {
      x: Math.max(0, (area.left - 1) * CELL),
      y: Math.max(0, (area.top - 1) * CELL),
      width: 0,
      height: 0,
    }
    window.width = Math.min(STRIP.width, (area.right + 2) * CELL) - window.x
    window.height = Math.min(STRIP.height, (area.bottom + 2) * CELL) - window.y
    if (!touchesEdge && window.width * window.height >= MIN_AREA) windows.push(window)
  }
  return windows.sort((a, b) => a.y - b.y || a.x - b.x)
}

// The bounding box of one connected see-through area (flood fill, no recursion).
function fillArea(clear: Uint8Array, seen: Uint8Array, columns: number, rows: number, start: number) {
  const box = { left: columns, top: rows, right: -1, bottom: -1 }
  const stack = [start]
  seen[start] = 1
  while (stack.length > 0) {
    const index = stack.pop() as number
    const column = index % columns
    const row = (index - column) / columns
    box.left = Math.min(box.left, column)
    box.right = Math.max(box.right, column)
    box.top = Math.min(box.top, row)
    box.bottom = Math.max(box.bottom, row)
    const neighbours = [
      column > 0 ? index - 1 : -1,
      column < columns - 1 ? index + 1 : -1,
      row > 0 ? index - columns : -1,
      row < rows - 1 ? index + columns : -1,
    ]
    for (const next of neighbours) {
      if (next >= 0 && clear[next] && !seen[next]) {
        seen[next] = 1
        stack.push(next)
      }
    }
  }
  return box
}

// Reads a frame file in the browser and finds its windows.
export async function photoWindowsOf(file: Blob): Promise<PhotoWindow[]> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available')
    context.drawImage(bitmap, 0, 0)
    return findPhotoWindows(context.getImageData(0, 0, bitmap.width, bitmap.height))
  } finally {
    bitmap.close()
  }
}
