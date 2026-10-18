import { readFileSync } from 'node:fs'
import { type Locator, type Page, expect, test } from '@playwright/test'
import { chooseFrame, countPrints } from './booth-helpers.ts'

// The event's own frame (event-frames/knowing-christ-more.png): its photo windows are not
// where the standard 3-photo holes are, and it carries its own text.
const FRAME = readFileSync('event-frames/knowing-christ-more.png')

test('an uploaded event frame puts the photos in its own windows and keeps its own text', async ({ page, browser }) => {
  test.setTimeout(90_000)
  const admin = await browser.newPage()
  // A second admin account, made through the API from the laptop (localhost).
  const account = await admin.request.post('/api/admin/accounts', { data: { username: 'events', password: 'knowing christ' } })
  expect(account.ok()).toBe(true)
  await admin.goto('/admin')
  await admin.getByRole('button', { name: 'Frames', exact: true }).click()

  const upload = admin.getByRole('region', { name: 'Upload your own frame' })
  await upload.getByLabel('Layout').selectOption({ label: 'Triple strip' })
  await upload.getByLabel('Name').fill('Knowing Christ More')
  await upload.getByLabel('Image (PNG)').setInputFiles({ name: 'kcm.png', mimeType: 'image/png', buffer: FRAME })
  await expect(upload.getByText('Found 3 photo windows')).toBeVisible()
  await expect(upload.getByLabel('Add the date and caption lines')).not.toBeChecked()
  await upload.getByRole('button', { name: 'Upload frame' }).click()
  await expect(admin.getByRole('region', { name: 'Triple strip' }).getByText('Knowing Christ More')).toBeVisible()

  await countPrints(page)
  const strip = await makeTripleStrip(page, /^Knowing Christ More/)

  await expectPhotosInWindowsAndArtworkKept(strip)

  // The download is the same file, marked as a 300 dpi (2 x 6 inch) print.
  const file = await (await page.request.get((await strip.getAttribute('src')) ?? '')).body()
  expect(file.toString('ascii', 37, 41)).toBe('pHYs')
  expect(file.readUInt32BE(41)).toBe(11811)
})

test('a frame saved without its windows still gets the photos in its windows and no text over it', async ({ page }) => {
  test.setTimeout(90_000)
  const created = await page.request.post('/api/admin/accounts', { data: { username: 'older', password: 'knowing christ' } })
  expect(created.ok()).toBe(true)
  const layouts = await (await page.request.get('/api/layouts')).json()
  const triple = layouts.find((layout: { shots: number }) => layout.shots === 3)
  // Exactly what an upload from before window detection stored: no windows, text on.
  const uploaded = await page.request.post(`/api/admin/frames?layoutId=${triple.id}&name=Older%20church%20frame`, {
    headers: { 'Content-Type': 'image/png' },
    data: FRAME,
  })
  expect(uploaded.ok()).toBe(true)

  await countPrints(page)
  const strip = await makeTripleStrip(page, /Older church frame/)
  await expectPhotosInWindowsAndArtworkKept(strip)
})

async function makeTripleStrip(page: Page, frame: RegExp): Promise<Locator> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /Triple strip/ }).click()
  await chooseFrame(page, frame)
  await page.getByRole('button', { name: 'Take the photos' }).click()
  await page.getByRole('button', { name: 'Start the countdown' }).click()
  await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 40_000 })
  await page.getByRole('button', { name: 'Make my strip' }).click()
  const strip = page.getByRole('img', { name: 'Your photo strip' })
  await expect(strip).toBeVisible({ timeout: 15_000 })
  return strip
}

// The photos fill the frame's three windows and the frame's own text (the anniversary band
// and the service times, where the standard caption lines would go) is untouched.
async function expectPhotosInWindowsAndArtworkKept(strip: Locator): Promise<void> {
  // Compare the saved strip with the frame, pixel by pixel, in the browser.
  const frameUrl = `data:image/png;base64,${FRAME.toString('base64')}`
  const result = await strip.evaluate(async (image: HTMLImageElement, frameSrc: string) => {
    const frame = new Image()
    frame.src = frameSrc
    await Promise.all([image.decode(), frame.decode()])
    const read = (source: HTMLImageElement) => {
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 1800
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.drawImage(source, 0, 0, 600, 1800)
      return (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3))
    }
    const stripAt = read(image)
    const frameAt = read(frame)
    // The "Knowing Christ More" band, and the footer where the standard caption lines go.
    const artwork = [
      [300, 1060],
      [150, 1075],
      [300, 1612],
      [300, 1660],
      [300, 1708],
    ]
    return {
      size: [image.naturalWidth, image.naturalHeight],
      // Inside each of the frame's windows, near the top, middle and bottom edges. A photo in
      // the standard 3-photo position would leave white gaps at y 530, 1015 and 1510.
      windows: [225, 413, 530, 600, 640, 828, 1015, 1130, 1321, 1510].map((y) => stripAt(300, y)),
      artworkKept: artwork.every(([x, y]) => stripAt(x, y).every((value, i) => Math.abs(value - frameAt(x, y)[i]) <= 2)),
    }
  }, frameUrl)
  expect(result.size).toEqual([600, 1800])
  // The fake camera's picture is green: the photos are in the frame's windows.
  for (const [r, g, b] of result.windows) expect(g).toBeGreaterThan(r + b)
  // The frame's own text is untouched: no date or caption lines drawn over it.
  expect(result.artworkKept).toBe(true)

}
