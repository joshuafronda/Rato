import json, math
G = json.load(open('glyphs.json'))['glyphs']
T = json.load(open('tagline.json'))['glyphs']
NAVY, LEAF, WHITE, DARK = '#14284F', '#9BC45A', '#FFFFFF', '#0B1630'
CAP = 745

def lens(cx, cy, r, ring, glass, blades, opening, glint):
    """A camera lens: ring, glass, six aperture blades, the opening and a glint (y down)."""
    ring_w = r * 0.36
    glass_r = r - ring_w
    hole = glass_r * 0.36
    parts = [
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r - ring_w / 2:.1f}" fill="none" stroke="{ring}" stroke-width="{ring_w:.1f}"/>',
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{glass_r:.1f}" fill="{glass}"/>',
    ]
    pts = [(cx + hole * math.cos(math.radians(60 * i - 90)), cy + hole * math.sin(math.radians(60 * i - 90))) for i in range(6)]
    lines = []
    for i in range(6):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
        # From this corner, along the hexagon edge direction, out to the glass edge.
        b = 2 * ((x1 - cx) * dx + (y1 - cy) * dy); c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - glass_r ** 2
        t = (-b + math.sqrt(b * b - 4 * c)) / 2
        lines.append(f'M{x1:.1f} {y1:.1f}L{x1 + dx * t:.1f} {y1 + dy * t:.1f}')
    parts.append(f'<path d="{" ".join(lines)}" stroke="{blades}" stroke-width="{r * 0.045:.1f}" stroke-linecap="round"/>')
    parts.append(f'<path d="M{" L".join(f"{x:.1f} {y:.1f}" for x, y in pts)}Z" fill="{opening}"/>')
    parts.append(f'<circle cx="{cx - glass_r * 0.42:.1f}" cy="{cy - glass_r * 0.42:.1f}" r="{glass_r * 0.13:.1f}" fill="{glint}"/>')
    return '\n    '.join(parts)

def glyph(g, x, base_y, scale, fill):
    return f'<path transform="matrix({scale} 0 0 {-scale} {x:.1f} {base_y:.1f})" d="{g["d"]}" fill="{fill}"/>'

def wordmark(x, base_y, scale, ink, glass, opening, glint):
    """R A T + lens O. Returns (svg, width)."""
    out = []
    cursor = 0
    for ch, kern in (('R', 15), ('A', -40), ('T', -20)):
        out.append(glyph(G[ch], x + cursor * scale, base_y, scale, ink))
        cursor += G[ch]['advance'] + kern
    o = G['O']['bounds']
    r = (o[2] - o[0]) / 2 * scale
    cx = x + (cursor + (o[0] + o[2]) / 2) * scale
    cy = base_y - (o[1] + o[3]) / 2 * scale
    out.append(lens(cx, cy, r, ink, glass, ink if ink != WHITE else NAVY, opening, glint))
    width = (cursor + G['O']['advance']) * scale
    return '\n  '.join(out), width

def tagline(text, x, base_y, scale, fill, tracking):
    out, cursor = [], 0
    for ch in text:
        if ch == ' ':
            cursor += 260 + tracking; continue
        out.append(glyph(T[ch], x + cursor * scale, base_y, scale, fill))
        cursor += T[ch]['advance'] + tracking
    return '\n  '.join(out), cursor * scale


INDIGO, NIGHT, MUTED = '#1B1446', '#120B33', '#6B6790'
BLOBS = [(70, 60, 230, '#22D3EE'), (440, 40, 210, '#3B82F6'), (300, 250, 200, '#7C3AED'),
         (40, 430, 220, '#E879F9'), (470, 470, 230, '#34D399'), (230, 520, 150, '#A78BFA')]

def holo_defs():
    """Shared gradients: the mesh tile, the lens glass, the lens ring, the word fill."""
    return f"""<defs>
  <clipPath id="tile-clip"><rect width="512" height="512" rx="113"/></clipPath>
  <filter id="mesh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="58"/></filter>
  <radialGradient id="gloss" cx="0.3" cy="0.18" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.65"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0.35"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="0.35" stop-color="#3B82F6"/><stop offset="0.65" stop-color="#7C3AED"/><stop offset="1" stop-color="#E879F9"/></linearGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="0.3" stop-color="#3B82F6"/><stop offset="0.55" stop-color="#7C3AED"/><stop offset="0.8" stop-color="#E879F9"/><stop offset="1" stop-color="#34D399"/></linearGradient>
</defs>"""

def icon(x, y, size):
    """The camera: a holographic glossy tile, a white flash and a holographic lens."""
    s = size / 512
    tile = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>' for cx, cy, r, c in BLOBS)
    return f"""<g transform="translate({x} {y}) scale({s:.5f})">
  <g clip-path="url(#tile-clip)"><rect width="512" height="512" fill="#6D5BFF"/><g filter="url(#mesh)">{tile}</g>
  <rect width="512" height="512" fill="url(#gloss)"/></g>
  <rect x="3" y="3" width="506" height="506" rx="110" fill="none" stroke="url(#edge)" stroke-width="6"/>
  <rect x="358" y="72" width="72" height="41" rx="15" fill="#FFFFFF" opacity="0.92"/>
  {lens(256, 282, 174, '#FFFFFF', 'url(#glass)', INDIGO, NIGHT, '#FFFFFF')}
</g>"""

def word(x, base_y, scale, ink, blades, ring=None):
    """R A T in one colour + the lens O: a ring in the letter colour, holographic glass."""
    out, cursor = [], 0
    for ch, kern in (('R', 15), ('A', -40), ('T', 0)):
        out.append(glyph(G[ch], x + cursor * scale, base_y, scale, ink))
        cursor += G[ch]['advance'] + kern
    o = G['O']['bounds']
    r = (o[2] - o[0]) / 2 * scale
    cx = x + (cursor + (o[0] + o[2]) / 2) * scale
    cy = base_y - (o[1] + o[3]) / 2 * scale
    out.append(lens(cx, cy, r, ring or ink, 'url(#glass)', blades, NIGHT, '#FFFFFF'))
    return ''.join(out), (cursor + G['O']['advance']) * scale

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{holo_defs()}{body}</svg>\n')

# 1. App icon.
open('rato-icon.svg', 'w').write(svg(512, 512, icon(0, 0, 512), 'Rato'))

# 2. Full logo, like the first one: icon as tall as RATO + PHOTO BOOTH.
def full(ink, tag_ink, blades):
    s, pad, tag_s, gap = 0.2, 6, 0.05, 26
    cap, tag_cap = CAP * s, CAP * tag_s
    size = round(pad + cap + gap + tag_cap + pad)
    text_x = size + 36
    wm, wm_w = word(text_x, pad + cap, s, ink, blades)
    tg, tg_w = tagline('PHOTO BOOTH', text_x + 4, pad + cap + gap + tag_cap, tag_s, tag_ink, 230)
    return icon(0, 0, size) + wm + tg, text_x + max(wm_w, tg_w) + 8, size
for name, ink, tag_ink, blades in (('rato-logo', INDIGO, MUTED, INDIGO), ('rato-logo-white', '#FFFFFF', '#C9C3F2', INDIGO)):
    body, w, h = full(ink, tag_ink, blades)
    open(f'{name}.svg', 'w').write(svg(w, h, body, 'Rato photo booth'))

# 3. Wordmark alone: RAT in the gradient (one sweep across the word) + the lens O.
s = 0.2
letters, wm_w = word(4, CAP * s + 4, s, '#FFFFFF', INDIGO, ring=INDIGO)
W3, H3 = wm_w + 8, CAP * s + 14
rat_only = letters[:letters.index('<circle')]          # the three letters, as a mask
lens_only = letters[letters.index('<circle'):]
body = (f'<defs><linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{W3:.0f}" y2="{H3:.0f}">'
        '<stop offset="0" stop-color="#22D3EE"/><stop offset="0.35" stop-color="#3B82F6"/><stop offset="0.7" stop-color="#7C3AED"/>'
        '<stop offset="1" stop-color="#E879F9"/></linearGradient>'
        f'<mask id="rat" maskUnits="userSpaceOnUse" x="0" y="0" width="{W3:.0f}" height="{H3:.0f}">{rat_only}</mask></defs>'
        f'<rect width="{W3:.0f}" height="{H3:.0f}" fill="url(#sweep)" mask="url(#rat)"/>{lens_only}')
open('rato-wordmark.svg', 'w').write(svg(W3, H3, body, 'Rato'))
print('ok')
