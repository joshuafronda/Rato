# Recolour the holo-camera icon (../../holo-camera/rato-icon.svg) into the Rato brand palette
# (navy #132F5C -> teal #16838F -> green #8CC63F, the same as the stacked logo).
from pathlib import Path

here = Path(__file__).resolve().parent
svg = (here / '../../holo-camera/rato-icon.svg').read_text()

glass_old = '<stop offset="0" stop-color="#22D3EE"/><stop offset="0.35" stop-color="#3B82F6"/><stop offset="0.65" stop-color="#7C3AED"/><stop offset="1" stop-color="#E879F9"/></linearGradient>'
glass_new = '<stop offset="0" stop-color="#2BC4D8"/><stop offset="0.55" stop-color="#16838F"/><stop offset="1" stop-color="#8CC63F"/></linearGradient>'
assert glass_old in svg
svg = svg.replace(glass_old, glass_new, 1)

# Tile colour pools: top-left navy, top-right bright teal, bottom-right green, bottom-left teal.
swaps = {
    '#6D5BFF': '#16838F',
    '#22D3EE': '#0F2550',
    '#3B82F6': '#1BA7B5',
    '#7C3AED': '#16838F',
    '#E879F9': '#167A8E',
    '#34D399': '#9BD14A',
    '#A78BFA': '#2BC4D8',
    '#1B1446': '#0B2547',
    '#120B33': '#0B2547',
}
for old, new in swaps.items():
    svg = svg.replace(old, new)

# Soft colour pools as radial gradients instead of one big blur: Chromium's blur left a hard
# edge where two pools met.
import re
pools = re.findall(r'<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="(#[0-9A-F]{6})"/>',
                   svg.split('<g filter="url(#mesh)">', 1)[1].split('</g>', 1)[0])
grads = ''.join(
    f'<radialGradient id="pool{i}" gradientUnits="userSpaceOnUse" cx="{x}" cy="{y}" r="{int(r) * 1.5:.0f}">'
    f'<stop offset="0" stop-color="{c}"/><stop offset="0.45" stop-color="{c}" stop-opacity="0.85"/>'
    f'<stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'
    for i, (x, y, r, c) in enumerate(pools))
rects = ''.join(f'<rect width="512" height="512" fill="url(#pool{i})"/>' for i in range(len(pools)))
svg = re.sub(r'<g filter="url\(#mesh\)">.*?</g>', '<g>' + rects + '</g>', svg)
svg = svg.replace('</defs>', grads + '</defs>', 1)

# Room around the tile so the soft glow is not cut off at the edges.
svg = svg.replace('viewBox="0 0 624 624"', 'viewBox="-64 -64 752 752"', 1)
(here / '../rato-icon-brand.svg').write_text(svg)
