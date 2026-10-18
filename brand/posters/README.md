# Posters

`photo-booth-today.png` (1080 x 1350, for Facebook and Instagram) and
`photo-booth-today-print.png` (2160 x 2700, prints sharp at 8 x 10 inches): "Photo booth is
open today!" for the Knowing Christ More 14th Church Anniversary, with five of the event
frames.

`source/` rebuilds them from the frames in `event-frames/`: `python3 make-poster.py`, then
`node render.mjs` (needs the project's Playwright Chromium).
