import { expect, test } from '@playwright/test'

// Phase 2 gate: a full strip can be made start to finish.
test('a guest makes a strip start to finish, retaking one shot', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.getByTestId('camera-preview')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()

  await page.getByRole('button', { name: /Classic duo/ }).click()
  await page.getByRole('button', { name: /Confetti/ }).click()

  await page.getByRole('button', { name: 'Black and white' }).click()
  await expect(page.getByRole('button', { name: 'Black and white' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('camera-preview')).toHaveCSS('filter', /grayscale\(1\)/)
  await page.getByRole('button', { name: 'Take the photos' }).click()

  await page.getByRole('button', { name: 'Start the countdown' }).click()
  await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('img', { name: /^Shot \d$/ })).toHaveCount(2)

  await page.getByRole('button', { name: 'Retake shot 2' }).click()
  await page.getByRole('button', { name: 'Start the countdown' }).click()
  await expect(page.getByRole('heading', { name: 'How do these look?' })).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Make my strip' }).click()
  const strip = page.getByRole('img', { name: 'Your photo strip' })
  await expect(strip).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => strip.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]))
    .toEqual([600, 1800])

  // The strip is saved on the server under its share code.
  const src = await strip.getAttribute('src')
  const code = /\/api\/strips\/([a-z2-9]{10})\/image/.exec(src ?? '')?.[1]
  expect(code).toBeTruthy()
  const saved = await page.request.get(`/api/strips/${code}`)
  expect(saved.ok()).toBe(true)

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
})
