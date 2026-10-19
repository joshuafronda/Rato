import { readFileSync } from 'node:fs'
import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const file of ['rato-stacked.svg', 'rato-stacked-lens.svg']) {
  const svg = readFileSync(file, 'utf8')
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:1024px;height:1024px;display:block">`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: file.replace('.svg', '.png'), omitBackground: true })
  await page.close()
}
await browser.close()
