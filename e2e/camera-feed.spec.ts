import { expect, test } from '@playwright/test'

test('the booth screen shows a live camera feed', async ({ page }) => {
  await page.goto('/')
  const preview = page.getByTestId('camera-preview')
  await expect(preview).toBeVisible()

  // Playing means real frames are arriving, not just an empty video element.
  await expect
    .poll(() => preview.evaluate((video: HTMLVideoElement) => ({
      playing: !video.paused && video.readyState >= 2,
      hasSize: video.videoWidth > 0 && video.videoHeight > 0,
    })))
    .toEqual({ playing: true, hasSize: true })
})

test('the booth explains a blocked camera and offers a retry', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  // Simulate the guest (or Windows) blocking the camera.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Camera access was blocked')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await context.close()
})

test('the server is reachable and the database is migrated', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBe(true)
  expect(await res.json()).toEqual({ ok: true, database: 'ok', schemaVersion: 2 })
})
