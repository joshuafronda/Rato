# Facebook cover

Plain cover photos with the stacked RA/TO logo (`../stacked/rato-stacked.svg`) on the right.

| File | Background |
| --- | --- |
| `rato-cover-white.png` | white `#FFFFFF` |
| `rato-cover-black.png` | black `#000000` |

- Size 1640 x 624 (Facebook's recommended cover size, shown at 820 x 312 on desktop).
- Phones show only the middle of the cover (about 1110 px of the 1640), so the logo sits
  320 px from the right edge. That keeps it fully visible on both desktop and phone.
  `preview.png` shows both views.
- Re-render: `node brand/covers/source/make.mjs` from inside `brand/covers/` (needs Playwright's Chromium).
