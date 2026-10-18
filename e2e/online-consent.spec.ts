import { expect, test } from '@playwright/test'
import { makeStrip } from './booth-helpers.ts'

const ONLINE_LABEL = 'Show my strip in the online gallery (anyone with the link can see it)'

// The booth server runs without Firebase here, so the share link is faked to say the online
// gallery is on.
test('the guest consents to the online gallery under wording that says so', async ({ page }) => {
  test.setTimeout(60_000)
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/strips/*/share', async (route) => {
    await released
    const response = await route.fetch()
    await route.fulfill({ response, json: { ...(await response.json()), onlineGallery: true } })
  })
  await makeStrip(page)

  // Still loading the link: no consent possible yet.
  await expect(page.getByRole('switch')).toBeDisabled()
  release()
  // Not ticked here: a shared strip would show in the gallery other specs expect empty.
  await expect(page.getByLabel(ONLINE_LABEL)).toBeEnabled()
})

test('sharing still works when the share link fails, with the online wording', async ({ page }) => {
  test.setTimeout(60_000)
  await page.route('**/api/strips/*/share', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }))
  await makeStrip(page)
  await expect(page.getByLabel(ONLINE_LABEL)).toBeEnabled()
})
