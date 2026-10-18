const TILE_SIZE = 128

let tile: HTMLCanvasElement | null | undefined

// A small tile of random grey noise, made once and reused by the live preview and the
// composer. Null where canvas is not available.
export function grainTile(): HTMLCanvasElement | null {
  if (tile !== undefined) return tile
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    tile = null
    return tile
  }
  const pixels = context.createImageData(TILE_SIZE, TILE_SIZE)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grey = Math.floor(Math.random() * 256)
    pixels.data[i] = grey
    pixels.data[i + 1] = grey
    pixels.data[i + 2] = grey
    pixels.data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  tile = canvas
  return tile
}
