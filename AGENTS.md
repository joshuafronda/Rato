# Rato

Offline photo booth web app (booth screen, guest gallery, admin dashboard) that runs on one
Windows laptop. Built with the BrewedOps Agentic Framework (https://brewedops.cloud/framework).
Full spec: `Build - Specs/prompt.md`.

## Stack
- Client: React + Vite + TypeScript (`client/`), strip composed in the browser canvas.
- Server: Node.js 24 + Express (`server/`), TypeScript run directly by Node (type stripping, no
  build step) - so only erasable TS syntax: no `enum`, no `namespace`, no parameter properties.
- Database: SQLite through Node's built-in `node:sqlite` (one file in `storage/`), numbered SQL
  migrations in `server/db/migrations/`.
- Camera: any camera the browser can see, behind the `CaptureSource` interface
  (`client/src/capture/`). digiCamControl comes later as another `CaptureSource`.
- No internet, no cloud services. Guest photos and the database never leave the laptop.

## Structure
- `client/src/booth/` guest flow, `client/src/admin/` dashboard, `client/src/gallery/` gallery,
  `client/src/capture/` camera sources, `client/src/composer/` canvas strip composer,
  `client/src/lib/` API calls and shared logic - never fetch inside components.
- `server/routes/` HTTP only (parse, call a service, respond), `server/services/` the work,
  `server/db/` connection, migrations and queries. SQL lives only in `server/db/`.
- Files `kebab-case`, components `PascalCase`, functions `camelCase`.
- Storage folder `storage/` (photos, strips, frames, the `.db` file) is git-ignored.

## Real package code (opensrc) - always, before using any dependency
- Run `opensrc path <package>` and read the real source before writing code that uses it.
  npm `opensrc path <name>` | Python `pypi:<name>` | Rust `crates:<name>` | GitHub `<user>/<repo>`
- Cite the file you read. Never guess method names, options or types, even for familiar packages.

## The build loop - for every small piece
0. **Check first**: write a test (for UI, a browser check) that FAILS because the change is
   missing; build until it passes. Test, lint and build must all be green before "done".
   Test command: `npm test` (vitest, both workspaces) and `npm run test:e2e` (Playwright)
1. **code-structure skill**: one version of each operational step; repeats go into a service
   layer. Actions own the rules, services own the mechanics.
2. **Clarity pass** on the changed code only: same behavior, fewer lines, no nested ternaries,
   no clever one-liners, no refactoring of untouched code.
3. **scanloop skill**: gitleaks + semgrep + osv-scanner on the diff. Every secret is blocking.
4. **greploop skill**: review panel scores 1-5; fix blocking + major findings, re-review from a
   fresh context until no blocking or major finding is left. Keep diffs small - a big diff
   never converges.
5. Commit, push, CI green. That is "done". It is not "live".

## CI and deploy (ship skill)
- Target: the event laptop (local only, no host) | Live: http://localhost:3000 | Server path /
  process: TBD
- Deploy command: TBD | Rollback: TBD
- CI (`.github/workflows/ci.yml`): TBD - added once the repo has a GitHub remote.
- Once CI exists, after ANY dependency change: `gh workflow run relock.yml`, `git pull`,
  `gh workflow run ci.yml`.
- Native bindings (npm/cli#4828): a plain `npm i` can prune other platforms' native packages
  from `package-lock.json`, and without the Windows one Vite/Vitest fail with "Cannot find
  native binding". So:
  - The root `package.json` pins `@rolldown/binding-win32-x64-msvc` and
    `lightningcss-win32-x64-msvc` as optionalDependencies, so this laptop always has them.
  - `npm test` first runs `scripts/check-native-bindings.mjs`, which fails if a pin no longer
    matches the `rolldown`/`lightningcss` version in the lockfile, or if the lockfile lost the
    Linux/macOS bindings.
  - After ANY dependency change (`npm install <pkg>`, a Vite upgrade, or a plain `npm i` that
    rewrote the lockfile): update the pins if the check says so, run `npm run relock` (rebuilds
    the lockfile with every platform), then `npm test` and `npm run build`, and commit the
    lockfile.
  - To set up a fresh checkout, use `npm ci` (installs exactly what the lockfile lists).

## Running it
- Development: `npm run dev` (Express API on :3000) and, in a second terminal,
  `npm run dev:client` (Vite on :5173, forwards /api to the server). Open http://localhost:5173.
- Booth / event: `npm start` (builds the client, then starts the server), then run
  `scripts\booth-chrome.cmd` (Chrome kiosk mode, silent printing to the default printer).
  Once per laptop: `scripts\allow-phones-firewall.cmd` as administrator, so phones reach
  the gallery and QR links. The server prints the phone address at startup; set PUBLIC_HOST
  if it picked the wrong network.
- Print paper is the `print_paper` setting: `4x6` (two strips side by side, cut in half) or
  `2x6`. Set the photo printer as the Windows default printer.
- **Nothing deploys unless the user says "deploy" for this change.**
- Uploaded is not live. Use the changed feature on the real booth and report what was verified
  and what the user still needs to check.

## Phases (each gate needs the user's approval)
1. Foundation - server, database with migrations, live camera feed. Gate: feed shows on booth.
2. Booth flow - layouts, frames, filters, capture, composer. Gate: full strip start to finish.
3. Print and share - printing + queue, QR, local gallery. Gate: strip prints, opens on a phone.
4. Admin and polish - dashboard, settings, backup, real camera test. Gate: end-to-end test.

## Notes (long-term memory)
- Notes folder: TBD (plain Markdown).
- Search it before any web search when a task touches past work or decisions.
- On "save progress": a dated note under `10 - Projects/Rato/` - what changed, what went
  wrong, what to remember - then commit and push.

## House rules
- Everything in the user's global rules file applies here too.
- Show the plan for each phase before writing code and wait for the user's go.
- Gallery is opt-in: only strips a guest chooses to share are public. Auto-delete is an admin
  setting, off by default. One admin account, password stored as a hash.
- Never overwrite the user's existing files or rules without asking. No secrets in the repo.
