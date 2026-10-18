import { expect, test } from '@playwright/test'
import { makeStrip } from './booth-helpers.ts'

// Phase 3 gate: a strip prints and opens on a phone.
test('a guest prints copies, gets a QR code, and shares to the gallery', async ({ page, browser }) => {
  test.setTimeout(60_000)
  // Count print calls instead of opening a print dialog.
  await page.addInitScript(() => {
    const state = window as unknown as { prints: number }
    state.prints = 0
    window.print = () => {
      state.prints += 1
    }
  })
  const code = await makeStrip(page)

  await page.getByRole('button', { name: '2 copies' }).click()
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(page.getByText('Printing 2 copies…')).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as { prints: number }).prints)).toBe(2)
  // The booth reported the job as printed, so a second claim finds nothing.
  await expect
    .poll(async () => (await (await page.request.post('/api/print-queue/claim')).json()).job)
    .toBeNull()

  await expect(page.getByRole('img', { name: 'QR code for your strip' })).toBeVisible()
  await expect(page.getByText(new RegExp(`/s/${code}$`))).toBeVisible()

  // Not shared yet: the gallery does not show it.
  const phone = await browser.newPage()
  await phone.goto('/gallery')
  await expect(phone.getByText('No strips have been shared yet.')).toBeVisible()

  await page.getByLabel('Show my strip in the gallery').check()
  await expect
    .poll(async () => (await (await page.request.get('/api/gallery')).json()).strips.length)
    .toBe(1)

  await phone.reload()
  await phone.getByRole('img', { name: 'A shared photo strip' }).click()
  await expect(phone).toHaveURL(new RegExp(`/s/${code}$`))
  const shared = phone.getByRole('img', { name: 'Your photo strip' })
  await expect(shared).toBeVisible()
  await expect.poll(() => shared.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(600)
  await expect(phone.getByRole('link', { name: 'Download' })).toHaveAttribute('href', `/api/strips/${code}/image`)
})
