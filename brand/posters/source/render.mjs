import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [scale, out] of [[1, 'poster.png'], [2, 'poster-print.png']]) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale })
  await page.goto('file://' + process.cwd() + '/poster.html')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await page.screenshot({ path: out })
  await page.close()
}
await browser.close()
