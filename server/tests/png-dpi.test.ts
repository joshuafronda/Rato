import { crc32, deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { withDpi } from '../services/png-dpi.ts'

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(extra: Buffer[] = []): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0)
  header.writeUInt32BE(6, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...extra,
    chunk('IDAT', deflateSync(Buffer.alloc((2 * 4 + 1) * 6))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// The chunk types in order, and the pHYs values if there is one.
function chunks(file: Buffer): { types: string[]; perMetre?: [number, number, number] } {
  const types: string[] = []
  let perMetre: [number, number, number] | undefined
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at)
    const type = file.toString('ascii', at + 4, at + 8)
    types.push(type)
    if (type === 'pHYs') perMetre = [file.readUInt32BE(at + 8), file.readUInt32BE(at + 12), file[at + 16]]
    const body = file.subarray(at + 4, at + 8 + length)
    expect(file.readUInt32BE(at + 8 + length), `${type} CRC`).toBe(crc32(body))
    at += 12 + length
  }
  return { types, perMetre }
}

describe('withDpi', () => {
  it('marks a PNG as 300 dpi right after its header', () => {
    const result = chunks(withDpi(png(), 300))
    expect(result.types).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND'])
    // 300 dots per inch = 11811 per metre, unit 1 = metre.
    expect(result.perMetre).toEqual([11811, 11811, 1])
  })

  it('replaces an existing resolution instead of adding a second one', () => {
    const old = Buffer.alloc(9)
    old.writeUInt32BE(2835, 0)
    old.writeUInt32BE(2835, 4)
    old[8] = 1
    const result = chunks(withDpi(png([chunk('pHYs', old)]), 300))
    expect(result.types).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND'])
    expect(result.perMetre).toEqual([11811, 11811, 1])
  })

  it('leaves anything that is not a well-formed PNG untouched', () => {
    const odd = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    expect(withDpi(odd, 300)).toBe(odd)
  })
})
