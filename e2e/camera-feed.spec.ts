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

test('a blocked camera is explained, and Try again recovers once it is allowed', async ({ page }) => {
  // Simulate the guest (or Windows) blocking the camera until the test unblocks it.
  await page.addInitScript(() => {
    const open = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    const state = window as unknown as { cameraBlocked: boolean }
    state.cameraBlocked = true
    navigator.mediaDevices.getUserMedia = (constraints) =>
      state.cameraBlocked ? Promise.reject(new DOMException('blocked', 'NotAllowedError')) : open(constraints)
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Camera access was blocked')

  await page.evaluate(() => {
    ;(window as unknown as { cameraBlocked: boolean }).cameraBlocked = false
  })
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByTestId('camera-preview')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('the server is reachable and the database is migrated', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body).toMatchObject({ ok: true, database: 'ok' })
  expect(body.schemaVersion).toBeGreaterThan(0)
})
