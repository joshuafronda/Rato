import { readFileSync } from 'node:fs'
import { chromium } from '/home/user/Rato/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const name of ['rato-co-lime', 'rato-co-holo', 'rato-co-script-lime', 'rato-co-script-holo']) {
  const svg = readFileSync(name + '.svg', 'utf8')
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  const width = 2000
  const height = Math.round((width * Number(h)) / Number(w))
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${width}px;height:${height}px;display:block">`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: name + '.png', omitBackground: true })
  await page.close()
}
await browser.close()
