import { crc32, deflateSync } from 'node:zlib'
import { type Page, expect } from '@playwright/test'

// Makes a 2-shot strip with the default choices and waits for the finish screen.
export async function makeStrip(page: Page): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /Classic duo/ }).click()
  await chooseFrame(page, /Classic/)
  await page.getByRole('button', { name: 'Take the photos' }).click()
  await page.getByRole('button', { name: 'Start the countdown' }).click()
  await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Make my strip' }).click()
  const strip = page.getByRole('img', { name: 'Your photo strip' })
  await expect(strip).toBeVisible({ timeout: 15_000 })
  const src = (await strip.getAttribute('src')) ?? ''
  const code = /\/api\/strips\/([a-z2-9]{10})\/image/.exec(src)?.[1]
  if (!code) throw new Error(`No share code in ${src}`)
  return code
}

// Picks a frame: tap its card to see it enlarged, then use it.
export async function chooseFrame(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('button', { name }).first().click()
  await expect(page.getByRole('dialog', { name: 'Frame preview' })).toBeVisible()
  await page.getByRole('button', { name: 'Use this frame' }).click()
}

// A fully transparent PNG, built by hand so the test needs no image library.
export function transparentPng(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc((width * 4 + 1) * height) // filter byte 0 + transparent pixels
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Counts window.print() calls instead of opening the print dialog.
export async function countPrints(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = window as unknown as { prints: number }
    state.prints = 0
    window.print = () => {
      state.prints += 1
    }
  })
}

export function printsSoFar(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { prints: number }).prints)
}
