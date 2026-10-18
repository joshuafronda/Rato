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

def icon(x, y, size, bg=NAVY):
    rad = size * 0.22
    return '\n  '.join([
        f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{rad:.1f}" fill="{bg}"/>',
        # The flash, top right.
        f'<rect x="{x + size * 0.70:.1f}" y="{y + size * 0.14:.1f}" width="{size * 0.14:.1f}" height="{size * 0.08:.1f}" rx="{size * 0.03:.1f}" fill="{LEAF}"/>',
        lens(x + size / 2, y + size * 0.55, size * 0.34, WHITE, LEAF, NAVY, DARK, WHITE),
    ])

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  {body}\n</svg>\n')

# 1. App icon.
open('rato-icon.svg', 'w').write(svg(512, 512, icon(0, 0, 512), 'Rato'))

# 2. Wordmark alone.
s = 0.2
wm, wm_w = wordmark(4, CAP * s + 4, s, NAVY, LEAF, DARK, WHITE)
open('rato-wordmark.svg', 'w').write(svg(wm_w + 8, CAP * s + 14, wm, 'Rato'))

# 3. Full logo: icon + wordmark + PHOTO BOOTH tagline. The icon is as tall as the text block.
def full(ink, tag_ink):
    s = 0.2
    pad = 6                      # room for the lens O's overshoot
    cap = CAP * s                # wordmark cap height
    tag_s = 0.05
    tag_cap = CAP * tag_s
    gap = 26
    size = round(pad + cap + gap + tag_cap + pad)
    text_x = size + 36
    wm, wm_w = wordmark(text_x, pad + cap, s, ink, LEAF, DARK, WHITE)
    tg, tg_w = tagline('PHOTO BOOTH', text_x + 4, pad + cap + gap + tag_cap, tag_s, tag_ink, 230)
    return icon(0, 0, size) + '\n  ' + wm + '\n  ' + tg, text_x + max(wm_w, tg_w) + 8, size
body, w, h = full(NAVY, '#5B6577')
open('rato-logo.svg', 'w').write(svg(w, h, body, 'Rato photo booth'))
body, w, h = full(WHITE, '#C9D3E3')
open('rato-logo-white.svg', 'w').write(svg(w, h, body, 'Rato photo booth'))
print('ok')
