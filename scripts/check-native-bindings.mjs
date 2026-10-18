// Guards against npm/cli#4828: a plain `npm i` can prune other platforms' native bindings from
// package-lock.json (breaking Linux CI / other machines), and the Windows pins in package.json
// can drift from the rolldown/lightningcss versions Vite actually uses.
// Run by `npm test`. Fix a failure with `npm run relock`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const PINS = {
  '@rolldown/binding-win32-x64-msvc': 'rolldown',
  'lightningcss-win32-x64-msvc': 'lightningcss',
}
// Platforms the lockfile must still cover besides Windows x64 (Linux CI, macOS laptops).
const OTHER_PLATFORMS = {
  rolldown: ['@rolldown/binding-linux-x64-gnu', '@rolldown/binding-darwin-arm64'],
  lightningcss: ['lightningcss-linux-x64-gnu', 'lightningcss-darwin-arm64'],
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')).packages
const problems = []

for (const [binding, parent] of Object.entries(PINS)) {
  const pinned = pkg.optionalDependencies?.[binding]
  const used = lock[`node_modules/${parent}`]?.version
  if (pinned !== used) problems.push(`${binding} is pinned to ${pinned} but ${parent} is ${used}: set the pin to ${used}`)
}

for (const [parent, bindings] of Object.entries(OTHER_PLATFORMS)) {
  for (const binding of bindings) {
    if (!lock[`node_modules/${binding}`]) problems.push(`package-lock.json lost ${binding} (needed by ${parent} on other machines)`)
  }
}

if (problems.length > 0) {
  console.error('Native binding check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error('Fix: npm run relock   (rebuilds package-lock.json with every platform), then commit it.')
  process.exit(1)
}
console.log('Native binding check passed.')
