import { type Page, expect } from '@playwright/test'

// Makes a 2-shot strip with the default choices and waits for the finish screen.
export async function makeStrip(page: Page): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /Classic duo/ }).click()
  await page.getByRole('button', { name: /Classic/ }).first().click()
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
