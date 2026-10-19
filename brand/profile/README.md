# Facebook profile picture

The holo-camera icon (`../holo-camera/rato-icon.svg`) recoloured into the Rato brand palette
(navy `#132F5C` -> teal `#16838F` -> green `#8CC63F`, the same as the stacked logo and covers).

| File | Use |
| --- | --- |
| `rato-profile-white.png` | 1080 x 1080, white background (pairs with `../covers/rato-cover-white.png`) |
| `rato-profile-black.png` | 1080 x 1080, black background (pairs with `../covers/rato-cover-black.png`) |
| `rato-icon-brand.svg` | the recoloured icon on its own, any size |

Facebook shows the profile picture as a circle; the icon sits well inside it (see `preview.png`).

Re-render: `python3 brand/profile/source/recolor.py`, then `node brand/profile/source/make.mjs`
(needs Playwright's Chromium).
