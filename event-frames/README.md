# Event frames - Knowing Christ More (14th Church Anniversary)

Ready-to-upload frames for the **Triple strip** (3 photos). Each is 600 x 1800 with
see-through windows where the photos go and its own church text.

| File | Design |
| --- | --- |
| `knowing-christ-more.png` | The original Canva design (denim) |
| `knowing-christ-more-morning-light.png` | Ivory and gold, light rays, cross, Philippians 3:10 |
| `knowing-christ-more-navy-gold.png` | Deep navy with gold lettering and sparkles |
| `knowing-christ-more-sky-hills.png` | Sky, clouds and green hills, like the Canva placeholders |
| `knowing-christ-more-modern.png` | Modern: bold purple headline, tilted service-time cards, glossy cross, "That I may know Him" pill |

Upload in Admin > Frames > Upload your own frame: Layout **Triple strip**, a name, the PNG.
The form finds the 3 windows and turns "Add the date and caption lines" off.

`source/` draws the designs: `python3 make-designs.py` (Morning Light, Navy and Gold,
Sky and Hills) or `python3 make-modern.py`, then `node render.mjs <name>...` with the
HTML names (needs the project's Playwright Chromium).
