import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { type Page, expect, test } from '@playwright/test'
import { transparentPng } from './booth-helpers.ts'

// The online landing page (online-gallery/index.html), opened from disk with Firebase Storage
// faked, so the check needs no internet.
const PAGE_URL = pathToFileURL(join(import.meta.dirname, '..', 'online-gallery', 'index.html')).href
const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/rato-d2428.firebasestorage.app/o/'

async function fakeStorage(page: Page, index: unknown | (() => unknown)): Promise<string[]> {
  const requested: string[] = []
  await page.route(`${STORAGE}**`, (route) => {
    const url = route.request().url()
    requested.push(url)
    const headers = { 'access-control-allow-origin': '*' }
    const json = typeof index === 'function' ? index() : index
    if (url.startsWith(`${STORAGE}gallery.json?`)) return route.fulfill({ headers, json })
    return route.fulfill({ headers, contentType: 'image/png', body: transparentPng(600, 1800) })
  })
  return requested
}

test('shows the shared strips newest first and opens one full size', async ({ page }) => {
  const requested = await fakeStorage(page, {
    strips: [
      { booth: 'hall', code: 'bbbbbbbbbb', createdAt: '2026-10-18 10:00:00' },
      { booth: 'lobby', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
    ],
  })
  await page.goto(PAGE_URL)

  const strips = page.getByRole('button', { name: /^Open the strip from/ })
  await expect(strips).toHaveCount(2)
  await expect(page.getByRole('img', { name: 'A shared photo strip' }).first()).toHaveAttribute(
    'src',
    `${STORAGE}strips%2Fhall%2Fbbbbbbbbbb.png?alt=media`,
  )

  await strips.first().click()
  const viewer = page.getByRole('dialog', { name: 'Photo strip' })
  await expect(viewer).toBeVisible()
  await expect(viewer.getByRole('link', { name: 'Save photo' })).toHaveAttribute(
    'href',
    `${STORAGE}strips%2Fhall%2Fbbbbbbbbbb.png?alt=media`,
  )
  await viewer.getByRole('button', { name: 'Close' }).click()
  await expect(viewer).toBeHidden()
  expect(requested.some((url) => url.includes('gallery.json'))).toBe(true)
})

test('ignores an entry whose code or booth is not safe', async ({ page }) => {
  await fakeStorage(page, {
    strips: [
      { booth: 'hall', code: '../../evil', createdAt: '2026-10-18 10:00:00' },
      { booth: '../x', code: 'cccccccccc', createdAt: '2026-10-18 10:00:00' },
      { booth: 'lobby', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' },
    ],
  })
  await page.goto(PAGE_URL)
  await expect(page.getByRole('button', { name: /^Open the strip from/ })).toHaveCount(1)
})

test('says so when nothing is shared yet', async ({ page }) => {
  await fakeStorage(page, { strips: [] })
  await page.goto(PAGE_URL)
  await expect(page.getByText('No photos have been shared yet.')).toBeVisible()
})

test('says so when the list cannot be loaded', async ({ page }) => {
  await page.route(`${STORAGE}**`, (route) => route.fulfill({ status: 503, body: 'down' }))
  await page.goto(PAGE_URL)
  await expect(page.getByText('The photos could not be loaded. Check your connection and try again.')).toBeVisible()
})

test('a newly posted strip appears by itself within 10 seconds', async ({ page }) => {
  await page.clock.install()
  const strips = [{ booth: 'lobby', code: 'aaaaaaaaaa', createdAt: '2026-10-18 09:00:00' }]
  await fakeStorage(page, () => ({ strips }))
  await page.goto(PAGE_URL)
  const cards = page.getByRole('button', { name: /^Open the strip from/ })
  await expect(cards).toHaveCount(1)

  strips.unshift({ booth: 'hall', code: 'bbbbbbbbbb', createdAt: '2026-10-18 09:05:00' })
  await page.clock.runFor(10_000)
  await expect(cards).toHaveCount(2)
})
