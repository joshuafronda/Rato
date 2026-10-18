// Rebuilds package-lock.json from scratch so it lists every platform's native bindings
// (a plain `npm i` can prune them - npm/cli#4828). Run with `npm run relock`, then commit.
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
for (const path of ['node_modules', 'package-lock.json']) {
  rmSync(join(ROOT, path), { recursive: true, force: true })
}
execSync('npm install', { cwd: ROOT, stdio: 'inherit' })
execSync('node scripts/check-native-bindings.mjs', { cwd: ROOT, stdio: 'inherit' })
