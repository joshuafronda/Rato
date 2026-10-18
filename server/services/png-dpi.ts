import { crc32 } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const INCHES_PER_METRE = 39.3701

// Records the print resolution in a PNG (its pHYs chunk), so photo apps and printers size
// a 600 x 1800 strip at 300 dpi as 2 x 6 inches instead of guessing 72 or 96 dpi.
// Anything that is not a well-formed PNG is returned unchanged.
export function withDpi(png: Buffer, dpi: number): Buffer {
  if (png.length < 33 || !png.subarray(0, 8).equals(SIGNATURE) || png.toString('ascii', 12, 16) !== 'IHDR') return png
  const headerEnd = 8 + 12 + png.readUInt32BE(8)
  const parts = [png.subarray(0, headerEnd), physChunk(dpi)]
  // Copy every later chunk except an existing pHYs.
  for (let at = headerEnd; at + 12 <= png.length; ) {
    const end = at + 12 + png.readUInt32BE(at)
    if (end > png.length) return png
    if (png.toString('ascii', at + 4, at + 8) !== 'pHYs') parts.push(png.subarray(at, end))
    at = end
  }
  return Buffer.concat(parts)
}

function physChunk(dpi: number): Buffer {
  const perMetre = Math.round(dpi * INCHES_PER_METRE)
  const chunk = Buffer.alloc(21)
  chunk.writeUInt32BE(9, 0)
  chunk.write('pHYs', 4, 'ascii')
  chunk.writeUInt32BE(perMetre, 8)
  chunk.writeUInt32BE(perMetre, 12)
  chunk[16] = 1 // the unit is the metre
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 17)), 17)
  return chunk
}
