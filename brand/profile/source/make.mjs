import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
// Facebook profile picture: square 1080 x 1080, shown cropped to a circle, so the icon stays
// well inside the circle.
const S = 1080
const ICON = 900                       // icon box (viewBox 752, tile is 512 of it)
const read = (p) => readFileSync(new URL(p, import.meta.url))
const icon = read('../rato-icon-brand.svg').toString('base64')
const versions = [['white', '#FFFFFF'], ['black', '#000000']]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [name, bg] of versions) {
  const page = await browser.newPage({ viewport: { width: S, height: S } })
  await page.setContent(`<body style="margin:0;width:${S}px;height:${S}px;background:${bg};display:flex;align-items:center;justify-content:center">
    <img src="data:image/svg+xml;base64,${icon}" style="width:${ICON}px;height:${ICON}px">
  </body>`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: new URL(`../rato-profile-${name}.png`, import.meta.url).pathname })
  await page.close()
}
// Preview: the square, and the circle Facebook shows.
const png = (n) => read(`../rato-profile-${n}.png`).toString('base64')
const preview = await browser.newPage({ viewport: { width: 760, height: 400 } })
await preview.setContent(`<body style="margin:0;padding:20px;background:#E4E6EB;display:grid;grid-template-columns:repeat(4,170px);gap:14px;font:600 13px sans-serif">
  ${versions.map(([n]) => `<div>${n} - square<img src="data:image/png;base64,${png(n)}" style="width:170px;display:block;margin-top:6px"></div>
  <div>${n} - on the page<img src="data:image/png;base64,${png(n)}" style="width:170px;display:block;margin-top:6px;border-radius:50%;outline:4px solid #fff"></div>`).join('')}</body>`)
await preview.waitForTimeout(300)
await preview.screenshot({ path: new URL('../preview.png', import.meta.url).pathname, fullPage: true })
await browser.close()
