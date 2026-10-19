import { readFileSync } from 'node:fs'
import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
// Facebook cover: 1640 x 624. Phones show it 640 x 360 (height fills, sides cropped), which
// keeps only the middle ~1110 px, so anything important stays more than ~265 px from the edges.
const W = 1640, H = 624
const SIZE = 300                      // logo size
const RIGHT = 320                     // distance from the right edge (inside the phone crop)
const logo = Buffer.from(readFileSync(new URL('../../stacked/rato-stacked.svg', import.meta.url))).toString('base64')
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const [name, bg] of [['white', '#FFFFFF'], ['black', '#000000']]) {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:${bg};position:relative">
    <img src="data:image/svg+xml;base64,${logo}" style="position:absolute;width:${SIZE}px;height:${SIZE}px;right:${RIGHT}px;top:${(H - SIZE) / 2}px">
  </body>`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `rato-cover-${name}.png` })
  await page.close()
}
// A preview of how it sits on a Facebook page: desktop, and the phone crop.
const preview = await browser.newPage({ viewport: { width: 1000, height: 760 } })
const b64 = (f) => Buffer.from(readFileSync(f)).toString('base64')
await preview.setContent(`<body style="margin:0;padding:20px;background:#E4E6EB;font:600 14px sans-serif">
  ${['white', 'black'].map((n) => `<div style="margin-bottom:6px">${n} - desktop</div>
  <div style="position:relative;width:820px;height:312px;border-radius:8px;overflow:hidden">
    <img src="data:image/png;base64,${b64(`rato-cover-${n}.png`)}" style="width:820px;height:312px;display:block"></div>
  <div style="margin:10px 0 6px">${n} - phone (middle of the cover)</div>
  <div style="width:320px;height:180px;overflow:hidden;border-radius:8px;position:relative">
    <img src="data:image/png;base64,${b64(`rato-cover-${n}.png`)}" style="position:absolute;height:180px;left:-${Math.round((1640 * 180 / 624 - 320) / 2)}px;top:0"></div>
  <div style="height:16px"></div>`).join('')}</body>`)
await preview.waitForTimeout(300)
await preview.screenshot({ path: 'preview.png', fullPage: true })
await browser.close()
