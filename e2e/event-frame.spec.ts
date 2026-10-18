import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { countPrints } from './booth-helpers.ts'

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
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /Triple strip/ }).click()
  await page.getByRole('button', { name: /Knowing Christ More/ }).click()
  await page.getByRole('button', { name: 'Take the photos' }).click()
  await page.getByRole('button', { name: 'Start the countdown' }).click()
  await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 40_000 })
  await page.getByRole('button', { name: 'Make my strip' }).click()
  const strip = page.getByRole('img', { name: 'Your photo strip' })
  await expect(strip).toBeVisible({ timeout: 15_000 })

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
      // The middle of each of the frame's own windows.
      windows: [stripAt(300, 413), stripAt(300, 828), stripAt(300, 1321)],
      artworkKept: artwork.every(([x, y]) => stripAt(x, y).every((value, i) => Math.abs(value - frameAt(x, y)[i]) <= 2)),
    }
  }, frameUrl)
  expect(result.size).toEqual([600, 1800])
  // The fake camera's picture is green: the photos are in the frame's windows.
  for (const [r, g, b] of result.windows) expect(g).toBeGreaterThan(r + b)
  // The frame's own text is untouched: no date or caption lines drawn over it.
  expect(result.artworkKept).toBe(true)

  // The download is the same file, marked as a 300 dpi (2 x 6 inch) print.
  const file = await (await page.request.get((await strip.getAttribute('src')) ?? '')).body()
  expect(file.toString('ascii', 37, 41)).toBe('pHYs')
  expect(file.readUInt32BE(41)).toBe(11811)
})
