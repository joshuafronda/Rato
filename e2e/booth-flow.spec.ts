import { expect, test } from '@playwright/test'
import { chooseFrame } from './booth-helpers.ts'

// Phase 2 gate: a full strip can be made start to finish.
test('a guest makes a strip start to finish, retaking one shot', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.getByTestId('camera-preview')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()

  await page.getByRole('button', { name: /Classic duo/ }).click()
  await chooseFrame(page, /Confetti/)

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

test('a guest can see a frame enlarged before choosing it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /Four-shot strip/ }).click()

  const card = page.getByRole('button', { name: /Confetti/ })
  const thumbnail = await card.locator('img').boundingBox()
  await card.click()
  const preview = page.getByRole('dialog', { name: 'Frame preview' })
  await expect(preview).toBeVisible()
  await expect(preview.getByRole('heading', { name: 'Confetti' })).toBeVisible()
  const enlarged = await preview.getByRole('img', { name: 'Confetti frame, enlarged' }).boundingBox()
  // Clearly bigger than the card's thumbnail, and nearly the whole screen height.
  expect(enlarged?.height ?? 0).toBeGreaterThan((thumbnail?.height ?? 0) * 1.4)
  expect(enlarged?.height ?? 0).toBeGreaterThan((page.viewportSize()?.height ?? 0) * 0.65)

  // Back to the list without choosing it.
  await page.getByRole('button', { name: 'Back to frames' }).click()
  await expect(preview).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Pick a frame' })).toBeVisible()

  // Escape closes it too.
  await card.click()
  await page.keyboard.press('Escape')
  await expect(preview).toBeHidden()

  // Choosing it goes on to the filters.
  await chooseFrame(page, /Confetti/)
  await expect(page.getByRole('heading', { name: 'Pick a filter' })).toBeVisible()
})
