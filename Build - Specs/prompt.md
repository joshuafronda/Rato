# Photo Booth Website: Build Prompt

This file has two parts. Part 1 installs the BrewedOps framework on the Windows laptop. Part 2 is the prompt to give the AI once the framework is installed.

---

## Part 1: Install the BrewedOps framework (Windows)

Prerequisites: Node.js and git (required). Also install `opensrc` (`npm install -g opensrc`), gitleaks, semgrep, osv-scanner, and the GitHub CLI (`gh auth login`). Per-OS commands are in `.agents/skills/brewedops-app/references/setup.md` inside the kit.

Clone and install in PowerShell:

```powershell
git clone https://github.com/brewed-ops/agentic-framework-kit
cd agentic-framework-kit
.\install.ps1 -Tool claude -DryRun     # preview what it will do
.\install.ps1 -Tool claude -Rules      # install the skills and the rules file
```

Options:
- `-Tool` accepts `claude`, `codex`, `cursor`, `gemini`, `copilot`, `antigravity`, a list such as `claude,cursor`, or `all`.
- Install into one project only: `.\install.ps1 -Tool claude -Project C:\code\photo-booth`
- Install only some skills: `.\install.ps1 -Tool claude -Skills greploop,scanloop,ship`
- Undo the last install: `.\install.ps1 -Tool claude -Restore`
- Update later: `git pull`, then rerun the same install command.

Or let the AI do it: open the cloned folder in Claude Code and say "Read AGENTS.md and install this kit for me."

Then make an empty folder for the booth, put this file and the design doc in it (`prompt.md` and `docs/design.md`), start a new Claude Code session there, and say **"brewedops app"**. Paste Part 2 below.

---

## Part 2: The prompt

Build a free, offline photo booth website from the plan below. Work the BrewedOps way: small steps, review every change, scan before moving on, and nothing ships without my approval. If `docs/design.md` exists, read it first. It holds the full design with diagrams.

### 1. Objective

A photo booth that runs on one Windows laptop with a DSLR attached. Guests pick a strip layout, frame and filter, take the shots, then print the strip or open it from their phone. I manage everything from an admin dashboard. It must work with no internet connection.

Success looks like this:
- A guest finishes a strip in under 2 minutes without help.
- I can add or change frames from the dashboard without touching code.
- The whole booth runs offline.

### 2. Decisions already made (do not re-open)

- **Front end:** React with Vite
- **Strip composition:** browser canvas, uploaded as a PNG
- **Back end:** Node.js with Express
- **Database:** SQLite
- **Camera, version 1:** the DSLR brand's free Windows webcam utility, read in the browser as a webcam
- **Camera, later upgrade:** digiCamControl for full-resolution shots, added behind the same capture interface
- **Printing:** Chrome kiosk-printing mode, no print dialog
- **Hosting:** the laptop only. No internet needed. No cloud services.
- **Cost:** free. No payments in version 1.

### 3. Architecture

```
DSLR --USB--> Windows laptop
                |-- Webcam utility        (DSLR appears as a webcam)
                |-- Node.js + Express     (public site, admin site, API)
                |-- SQLite database       (one file)
                |-- Storage folder        (photos, strips, frames)

Booth screen (laptop or tablet) --> http://localhost:3000
Guest phones                    --> http://<laptop-ip>:3000/gallery
Admin (phone or laptop)         --> http://<laptop-ip>:3000/admin
Printer (USB or Wi-Fi)          <-- print job from the booth browser
```

Suggested project layout:

```
photo-booth/
  client/            React + Vite
    src/booth/       public flow: lobby, layout, frame, filter, capture, review, finish
    src/admin/       dashboard and managers
    src/gallery/     local gallery and share page
    src/capture/     capture interface and implementations
    src/composer/    canvas strip composer
  server/
    routes/          public, admin, gallery
    db/              schema, migrations, queries
    services/        print, backup, settings
  storage/           photos/, strips/, frames/
  docs/design.md
```

### 4. System design

**Guest flow:** Lobby, layout, frame, filter, capture (countdown, one shot at a time), review (retake any shot), compose strip, finish (print, QR, gallery).

**Capture module.** Build it behind a small interface so the camera source can be swapped without touching the booth flow:

```
CaptureSource
  start()      open the camera
  preview()    return the live feed
  capture()    return one shot as an image
  stop()       release the camera
```

Version 1 ships `WebcamSource`. A later `DigiCamSource` calls digiCamControl for full-resolution shots.

**Strip composer.** Runs in the browser canvas. It places the shots by layout, applies the filter, draws the frame image over the top, adds the date and caption text, and exports a PNG. The PNG is uploaded to the server and saved with a share code.

**Printing.** The booth browser runs in Chrome kiosk-printing mode, so the print job goes straight to the printer. Guests pick 1 to 3 copies. Each job is saved as a print job record so it can be reprinted from the admin side.

**Local publishing.** The server listens on all network interfaces. A QR code on the finish screen links to `http://<laptop-ip>:3000/s/<share_code>`. Any phone on the same Wi-Fi can open it and the gallery. The Windows firewall must allow the port on the private network.

**API (high level)**

| Area | Endpoints |
| --- | --- |
| Public | list layouts, frames, filters; create a session; upload a photo; upload the finished strip; get a strip by share code; list public gallery; request a print |
| Admin | login, logout; stats; manage frames, layouts and filters; list, hide and delete strips; list print jobs and reprint; read and update settings; export a backup |

**Security.** Admin routes need a login session. Passwords are stored as hashes. The gallery shows only strips marked public. No guest data leaves the laptop.

### 5. Database (SQLite)

| Table | Columns |
| --- | --- |
| admins | id, username (unique), password_hash, created_at |
| layouts | id, name, shots (2, 3 or 4), orientation, active |
| frames | id, layout_id (fk), name, image_path, active, sort_order |
| filters | id, name, params (json), active, is_default |
| sessions | id, created_at, layout_id (fk), frame_id (fk), filter_id (fk) |
| photos | id, session_id (fk), shot_number, image_path |
| strips | id, session_id (fk, unique), image_path, share_code (unique), is_public, print_count, created_at |
| print_jobs | id, strip_id (fk), copies, status, created_at |
| settings | key (primary key), value |

Relationships: a layout has many frames. A session belongs to one layout, frame and filter, and has many photos and one strip. A strip has many print jobs.

Add indexes on `strips.share_code`, `photos.session_id` and `sessions.created_at`. Use migrations so the schema can change safely. Settings keys: countdown length, caption text, date format, printer, gallery on or off, auto-delete days.

### 6. Features

**Public side**
- Lobby with sample strips and a Start button
- 2, 3 and 4-shot layouts
- Frame picker with themes, plus date and caption text at the bottom
- Filter picker with live preview: natural, soft glow, black and white, film grain, warm, cool, pastel
- Countdown capture with a retake option for each shot
- Review screen, then the composed strip
- Finish screen: print (1 to 3 copies), QR code, download
- Local gallery with a share link for each strip

**Admin side (password login)**
- Overview: sessions today, total strips, prints, peak hours, most-used frame
- Frame and layout manager: upload, enable or disable, reorder
- Filter manager: enable or disable, set the default
- Gallery moderation: view, hide, delete
- Print queue with reprint
- Settings: countdown length, caption and date text, printer, auto-delete period
- Backup and export of photos and strips

### 7. Build phases

Build in this order. Each gate must pass, and I must approve, before the next phase starts.

1. **Foundation:** server, database with migrations, live camera feed in the browser.
   Gate: the camera feed shows on the booth screen.
2. **Booth flow:** layouts, frames, filters, capture, strip composer.
   Gate: a full strip can be made start to finish.
3. **Print and share:** printing and queue, QR code, local gallery.
   Gate: a strip prints and opens on a phone.
4. **Admin and polish:** dashboard, settings, backup, test with the real DSLR.
   Gate: the whole booth is tested end to end.

### 8. Working rules

- Show me the plan for each phase before writing code, and wait for my go.
- Keep each change small. Run greploop on every change and scanloop before each phase gate.
- Use one shared implementation for repeated operations.
- Never overwrite my existing files or rules without asking.
- Keep secrets out of the repo. Guest photos stay on the laptop.

### 9. Ask me before you start

1. What are the DSLR brand and model? This decides whether the webcam utility works or we start with digiCamControl.
2. What are the printer model and paper size?
3. Should the gallery show every strip, or only strips a guest agrees to share?
4. Should strips auto-delete after the event, or stay in the gallery?
5. Is a simple admin password enough for now?

### 10. Out of scope for version 1

Payments, cloud storage, email sharing, full-resolution capture (a planned upgrade).
