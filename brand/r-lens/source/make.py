import json, math
G = json.load(open('glyphs.json'))['glyphs']
T = json.load(open('tagline.json'))['glyphs']
CAP = 745
INDIGO, NIGHT, MUTED = '#1B1446', '#120B33', '#6B6790'
BLOBS = [(70, 60, 230, '#22D3EE'), (440, 40, 210, '#3B82F6'), (300, 250, 200, '#7C3AED'),
         (40, 430, 220, '#E879F9'), (470, 470, 230, '#34D399'), (230, 520, 150, '#A78BFA')]

# The R, drawn on a 512 grid: stem, a ring for the bowl (the lens ring), a diagonal leg.
TOP, BOTTOM, STROKE = 78, 434, 80
STEM_X = 118
BOWL_R = 132                       # outer radius of the bowl ring
BOWL_CX, BOWL_CY = 262, TOP + BOWL_R
RING = 66                          # ring thickness: thinner than the stem, so the lens shows

def r_shape(ink):
    stem = f'<rect x="{STEM_X}" y="{TOP}" width="{STROKE}" height="{BOTTOM - TOP}" rx="10" fill="{ink}"/>'
    # Top and middle arms join the stem to the ring, like the bars of a real R.
    arms = (f'<rect x="{STEM_X + 20}" y="{TOP}" width="{BOWL_CX - STEM_X - 20}" height="{RING}" fill="{ink}"/>'
            f'<rect x="{STEM_X + 20}" y="{BOWL_CY + BOWL_R - RING}" width="{BOWL_CX - STEM_X - 20}" height="{RING}" fill="{ink}"/>')
    ring = f'<circle cx="{BOWL_CX}" cy="{BOWL_CY}" r="{BOWL_R - RING / 2}" fill="none" stroke="{ink}" stroke-width="{RING}"/>'
    leg_top = BOWL_CY + BOWL_R - RING
    leg = (f'<path d="M{BOWL_CX - 46} {leg_top} L{BOWL_CX + 38} {leg_top} L{BOWL_CX + 150} {BOTTOM} '
           f'L{BOWL_CX + 62} {BOTTOM} Z" fill="{ink}" stroke="{ink}" stroke-width="6" stroke-linejoin="round"/>')
    return stem + arms + leg + ring

def lens_glass(blades, opening):
    """Holographic glass with six aperture blades, inside the bowl."""
    cx, cy = BOWL_CX, BOWL_CY
    r = BOWL_R - RING + 1
    hole = r * 0.36
    pts = [(cx + hole * math.cos(math.radians(60 * i - 90)), cy + hole * math.sin(math.radians(60 * i - 90))) for i in range(6)]
    lines = []
    for i in range(6):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
        b = 2 * ((x1 - cx) * dx + (y1 - cy) * dy); c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - r ** 2
        t = (-b + math.sqrt(b * b - 4 * c)) / 2
        lines.append(f'M{x1:.1f} {y1:.1f}L{x1 + dx * t:.1f} {y1 + dy * t:.1f}')
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#glass)"/>'
            f'<path d="{" ".join(lines)}" stroke="{blades}" stroke-width="{r * 0.07:.1f}" stroke-linecap="round"/>'
            f'<path d="M{" L".join(f"{x:.1f} {y:.1f}" for x, y in pts)}Z" fill="{opening}"/>'
            f'<circle cx="{cx - r * 0.42:.1f}" cy="{cy - r * 0.42:.1f}" r="{r * 0.14:.1f}" fill="#FFFFFF"/>')

def mark(ink):
    return r_shape(ink) + lens_glass(INDIGO, NIGHT)

DEFS = """<defs>
  <clipPath id="tile-clip"><rect width="512" height="512" rx="113"/></clipPath>
  <filter id="mesh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="58"/></filter>
  <filter id="halo" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#2A1270" flood-opacity="0.35"/></filter>
  <radialGradient id="gloss" cx="0.3" cy="0.18" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="0.35" stop-color="#3B82F6"/><stop offset="0.65" stop-color="#7C3AED"/><stop offset="1" stop-color="#E879F9"/></linearGradient>
</defs>"""

def tile():
    blobs = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>' for x, y, r, c in BLOBS)
    inner = f'<g clip-path="url(#tile-clip)"><rect width="512" height="512" fill="#6D5BFF"/><g filter="url(#mesh)">{blobs}</g></g>'
    return (f'<g filter="url(#halo)" transform="translate(256 256) scale(1.05) translate(-256 -256)">{inner}</g>'
            f'{inner}<g clip-path="url(#tile-clip)"><rect width="512" height="512" fill="url(#gloss)"/></g>')

def svg(w, h, body, title='Rato'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{DEFS}{body}</svg>\n')

GLOW = 56
# 1. App icon: glowing tile, white R, lens in the bowl.
open('r-icon.svg', 'w').write(svg(512 + 2 * GLOW, 512 + 2 * GLOW,
    f'<g transform="translate({GLOW} {GLOW})">{tile()}<g filter="url(#lift)">{mark("#FFFFFF")}</g></g>'))
# 2. The mark alone: indigo R (light backgrounds), white R (dark backgrounds).
open('r-mark.svg', 'w').write(svg(512, 512, mark(INDIGO)))
open('r-mark-white.svg', 'w').write(svg(512, 512, mark('#FFFFFF')))

# 3. Mark + RATO + PHOTO BOOTH.
def glyph(g, x, base, s, fill):
    return f'<path transform="matrix({s} 0 0 {-s} {x:.1f} {base:.1f})" d="{g["d"]}" fill="{fill}"/>'
def text(word, glyphs, x, base, s, fill, kerns, space=260):
    out, cur = [], 0
    for i, ch in enumerate(word):
        if ch == ' ':
            cur += space + kerns; continue
        out.append(glyph(glyphs[ch], x + cur * s, base, s, fill))
        cur += glyphs[ch]['advance'] + (kerns if isinstance(kerns, int) else kerns[i])
    return ''.join(out), cur * s
def lockup(ink, sub):
    size = 220
    k = size / 512
    s = 0.15                           # RATO cap height 112 px
    x = size + 20
    word, ww = text('RATO', G, x, 36 + CAP * s, s, ink, [15, -40, -20, 0])
    tag, tw = text('PHOTO BOOTH', T, x + 4, 36 + CAP * s + 52, 0.042, sub, 230)
    body = f'<g transform="scale({k:.4f})">{mark(ink)}</g>{word}{tag}'
    return svg(x + max(ww, tw) + 10, size, body, 'Rato photo booth')
open('r-logo.svg', 'w').write(lockup(INDIGO, MUTED))
open('r-logo-white.svg', 'w').write(lockup('#FFFFFF', '#C9C3F2'))
print('ok')
