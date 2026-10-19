# Rato Co. - sticker logo

A sticker-style script wordmark: white Pacifico lettering, a thick colour outline that sweeps
across the word, a dark edge with a drop shadow, tilted slightly upward.

| File | Text | Outline |
| --- | --- | --- |
| `rato-co-script-holo` | Rato Co. | Holographic (cyan, blue, violet, pink) - matches the camera logo |
| `rato-co-script-lime` | Rato Co. | Lime to green |
| `rato-co-holo` | RATO Co. | Holographic |
| `rato-co-lime` | RATO Co. | Lime to green |

SVGs are outlines (no font needed); PNGs are 2000 px wide with a transparent background.
`preview.png` shows them on dark and light backgrounds.

`source/`: `glyphs.py` extracts the letters from Pacifico (SIL Open Font License 1.1),
`make.py` draws the SVGs, `export.mjs` renders the PNGs with the project's Playwright Chromium.
