import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const PORT = 3100
// A fresh storage folder per run, so every run migrates a brand-new database. The config is
// re-read by each worker, but only the main process starts the web server with this value.
const STORAGE_DIR = join(tmpdir(), `stripshot-e2e-${process.pid}-${Date.now()}`)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
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
    command: 'npm run build && npm start',
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
