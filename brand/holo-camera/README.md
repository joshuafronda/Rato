# Rato - camera logo in holographic colours

The first Rato concept (camera icon, and the "O" of RATO as a lens) in the holographic
palette: a glossy mesh-gradient tile (cyan, blue, violet, magenta, mint), a white lens ring
with holographic glass, deep-indigo letters.

| File | Use |
| --- | --- |
| `rato-icon.svg` / `.png` | App icon, profile picture, favicon (1024 x 1024 PNG) |
| `rato-logo.svg` / `.png` | Icon + RATO + PHOTO BOOTH, on light backgrounds |
| `rato-logo-white.svg` / `.png` | The same on dark backgrounds |
| `rato-wordmark.svg` / `.png` | RAT in the gradient + the lens O |
| `preview.png` | All of them together |

Letters are outlines, so no font is needed. `source/make.py` draws the SVGs (it reuses the
lens and letter shapes of `brand/source/make.py`); `source/export.mjs` renders the PNGs.
