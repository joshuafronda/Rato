import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const name of ['morning-light', 'navy-gold', 'sky-hills']) {
  const page = await browser.newPage({ viewport: { width: 600, height: 1800 } })
  await page.goto('file://' + process.cwd() + '/' + name + '.html')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: name + '.png', omitBackground: true })
  await page.close()
}
await browser.close()
