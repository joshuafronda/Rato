import { expect, test } from '@playwright/test'
import { countPrints, printsSoFar, transparentPng } from './booth-helpers.ts'

// Phase 4 gate: the admin sets the booth up, a guest uses it, the admin manages the result.
test('the admin configures the booth, reprints and moderates a strip', async ({ page, browser }) => {
  test.setTimeout(90_000)
  const admin = await browser.newPage()
  await admin.goto('/admin')

  await test.step('first run: create the admin account', async () => {
    await expect(admin.getByRole('heading', { name: 'Create the admin account' })).toBeVisible()
    await admin.getByLabel('Username').fill('host')
    await admin.getByLabel('Password').fill('correct horse')
    await admin.getByRole('button', { name: 'Create account' }).click()
    await expect(admin.getByText('Sessions today')).toBeVisible()
  })

  await test.step('settings: caption and a 1-second countdown', async () => {
    await admin.getByRole('button', { name: 'Settings', exact: true }).click()
    await admin.getByLabel('Caption on the strip').fill('Ana & Ben')
    await admin.getByLabel('Countdown (seconds)').fill('1')
    await admin.getByRole('button', { name: 'Save settings' }).click()
    await expect(admin.getByText('Saved.')).toBeVisible()
  })

  await test.step('frames: upload a new frame for the 2-photo strip', async () => {
    await admin.getByRole('button', { name: 'Frames', exact: true }).click()
    await admin.getByLabel('Layout').selectOption({ label: 'Classic duo' })
    await admin.getByLabel('Name').fill('Gold')
    await admin.getByLabel('Image (PNG)').setInputFiles({ name: 'gold.png', mimeType: 'image/png', buffer: transparentPng(600, 1800) })
    await admin.getByRole('button', { name: 'Upload frame' }).click()
    await expect(admin.getByRole('region', { name: 'Classic duo' }).getByText('Gold')).toBeVisible()
  })

  await test.step('a guest makes and prints a strip with the new frame', async () => {
    await countPrints(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('button', { name: /Classic duo/ }).click()
    await page.getByRole('button', { name: /Gold/ }).click()
    await page.getByRole('button', { name: 'Take the photos' }).click()
    await page.getByRole('button', { name: 'Start the countdown' }).click()
    await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Make my strip' }).click()
    await page.getByRole('button', { name: 'Print', exact: true }).click()
    await expect.poll(() => printsSoFar(page)).toBe(1)
  })

  await test.step('overview counts it, and a reprint goes to the booth printer', async () => {
    await admin.getByRole('button', { name: 'Overview', exact: true }).click()
    await expect(admin.getByText('Gold (1)')).toBeVisible()
    await admin.getByRole('button', { name: 'Prints', exact: true }).click()
    await expect(admin.getByText('Printed')).toBeVisible()
    await admin.getByRole('button', { name: 'Reprint' }).click()
    await expect.poll(() => printsSoFar(page), { timeout: 15_000 }).toBe(2)
  })

  await test.step("download today's strips as a zip", async () => {
    await admin.getByRole('button', { name: 'Gallery', exact: true }).click()
    await expect(admin.getByText(/^1 strip on /)).toBeVisible()
    const [strips] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('link', { name: 'Download strips' }).click()])
    expect(strips.suggestedFilename()).toMatch(/^rato-\d{4}-\d{2}-\d{2}\.zip$/)
    const [withPhotos] = await Promise.all([
      admin.waitForEvent('download'),
      admin.getByRole('link', { name: 'Strips + original photos' }).click(),
    ])
    expect(withPhotos.suggestedFilename()).toMatch(/-with-photos\.zip$/)
  })

  await test.step('gallery moderation: delete the strip', async () => {
    const strip = admin.getByRole('img', { name: /^Strip / })
    await expect(strip).toHaveCount(1)
    const code = (await strip.getAttribute('alt'))?.replace('Strip ', '')
    admin.once('dialog', (dialog) => void dialog.accept())
    await admin.getByRole('button', { name: 'Delete' }).click()
    await expect(admin.getByText('No strips yet.')).toBeVisible()
    expect((await admin.request.get(`/api/strips/${code}`)).status()).toBe(404)
  })

  await test.step('backup', async () => {
    await admin.getByRole('button', { name: 'Settings', exact: true }).click()
    await admin.getByRole('button', { name: 'Back up now' }).click()
    await expect(admin.getByText(/Saved to .*rato-backup-\d{8}-\d{6}/)).toBeVisible()
  })

  await test.step('sign out locks the dashboard', async () => {
    await admin.getByRole('button', { name: /Sign out/ }).click()
    await expect(admin.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    expect((await admin.request.get('/api/admin/overview')).status()).toBe(401)
  })
})
