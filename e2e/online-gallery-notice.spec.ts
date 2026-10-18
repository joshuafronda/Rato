import { expect, test } from '@playwright/test'
import { makeStrip } from './booth-helpers.ts'

const NOTICE = 'Your strip is also posted to the online photo gallery.'

// The booth server runs without Firebase here, so the share link is faked to say the online
// gallery is on.
test('the finish screen tells the guest their strip goes to the online gallery', async ({ page }) => {
  test.setTimeout(60_000)
  await page.route('**/api/strips/*/share', async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, json: { ...(await response.json()), onlineGallery: true } })
  })
  await makeStrip(page)
  await expect(page.getByText(NOTICE)).toBeVisible()
  // The tick box is only about the laptop's Wi-Fi gallery again.
  await expect(page.getByLabel('Show my strip in the gallery')).toBeEnabled()
})

test('no online notice when the online gallery is off', async ({ page }) => {
  test.setTimeout(60_000)
  await makeStrip(page)
  await expect(page.getByRole('img', { name: 'QR code for your strip' })).toBeVisible()
  await expect(page.getByText(NOTICE)).toBeHidden()
})
