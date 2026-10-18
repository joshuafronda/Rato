import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const PORT = 3100
// A fresh storage folder per run, so every run migrates a brand-new database. Kept in an env
// var so workers (which re-read this file) and e2e/global-setup.ts see the same folder.
process.env.RATO_E2E_STORAGE ??= join(tmpdir(), `rato-e2e-${process.pid}-${Date.now()}`)
const STORAGE_DIR = process.env.RATO_E2E_STORAGE

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  // One server and database for every test, and every booth page prints whatever is in the
  // shared print queue, so tests run one at a time.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The booth runs in Chrome, so test in the installed Chrome, not a downloaded Chromium.
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // A synthetic camera feed, and auto-accept the permission prompt.
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: {
    command: 'npm start',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      STORAGE_DIR,
    },
  },
})
