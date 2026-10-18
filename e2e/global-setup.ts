import { readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

// Remove the temporary database folders of earlier runs. This can't happen at teardown:
// Playwright tears down before it stops the web server, which still holds the SQLite files.
export default async function globalSetup(): Promise<void> {
  const current = basename(process.env.RATO_E2E_STORAGE ?? '')
  const leftovers = (await readdir(tmpdir())).filter((name) => name.startsWith('rato-e2e-') && name !== current)
  await Promise.all(leftovers.map((name) => rm(join(tmpdir(), name), { recursive: true, force: true }).catch(() => {})))
}
