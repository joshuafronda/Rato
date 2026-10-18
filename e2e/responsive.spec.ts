import { expect, test } from '@playwright/test'

// Phones, tablets and the booth laptop: no page may scroll sideways.
const SIZES = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1366, height: 768 },
]

for (const size of SIZES) {
  test(`no sideways scrolling at ${size.width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: size })
    for (const path of ['/', '/gallery', '/admin']) {
      await page.goto(path)
      if (path === '/') await expect(page.getByTestId('camera-preview')).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: path })
        .toBeLessThanOrEqual(size.width)
    }
    await page.close()
  })
}
