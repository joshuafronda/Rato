# Rato - holographic logo

A second Rato identity: a glossy rounded tile filled with a holographic mesh gradient
(cyan, blue, violet, magenta, green) and a bold white **R**.

| File | Use |
| --- | --- |
| `rato-icon.svg` / `.png` | App icon, profile picture, favicon (1024 x 1024 PNG) |
| `rato-logo.svg` / `.png` | Icon + RATO + PHOTO BOOTH, on light backgrounds |
| `rato-logo-white.svg` / `.png` | The same on dark backgrounds |
| `rato-wordmark-gradient.svg` / `.png` | RATO filled with the holographic gradient |
| `preview.png` | All of them together |

All letters are outlines (Plus Jakarta Sans), so the files need no font. `source/make.py`
draws the SVGs; `source/export.mjs` renders the PNGs with the project's Playwright Chromium.
The first logo (camera-lens "O") is still in `brand/`.
