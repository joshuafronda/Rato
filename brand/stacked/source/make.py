import json, math
G = json.load(open('glyphs.json'))['glyphs']
CAP = 745

DEFS = """<defs>
  <clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath>
  <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#132F5C"/><stop offset="0.5" stop-color="#16838F"/><stop offset="1" stop-color="#8CC63F"/>
  </linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="60"/></filter>
  <filter id="lift" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#06203A" flood-opacity="0.3"/></filter>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2BC4D8"/><stop offset="0.55" stop-color="#16838F"/><stop offset="1" stop-color="#8CC63F"/></linearGradient>
</defs>"""

def tile():
    # A diagonal navy-teal-lime gradient, softened with blurred colour pools like the reference.
    pools = ('<circle cx="40" cy="40" r="210" fill="#0F2550"/><circle cx="470" cy="80" r="170" fill="#1BA7B5"/>'
             '<circle cx="470" cy="480" r="220" fill="#9BD14A"/><circle cx="90" cy="470" r="170" fill="#167A8E"/>')
    return (f'<g clip-path="url(#tile)"><rect width="512" height="512" fill="url(#base)"/>'
            f'<g filter="url(#soft)" opacity="0.75">{pools}</g></g>')

def letter(ch, x, base, s):
    return f'<path transform="matrix({s} 0 0 {-s} {x:.1f} {base:.1f})" d="{G[ch]["d"]}" fill="#FFFFFF"/>'

def line(chars, base, s, gap, lens_o=False):
    """One line of two letters, centred on the tile."""
    widths = [G[c]['advance'] * s for c in chars]
    total = sum(widths) + gap
    x = (512 - total) / 2
    out = []
    for c, w in zip(chars, widths):
        if c == 'O' and lens_o:
            out.append(lens(x, base, s))
        else:
            out.append(letter(c, x, base, s))
        x += w + gap
    return ''.join(out)

def lens(x, base, s):
    """The O as a camera lens: white ring, gradient glass, six blades, a glint."""
    b = G['O']['bounds']
    r = (b[2] - b[0]) / 2 * s
    cx, cy = x + (b[0] + b[2]) / 2 * s, base - (b[1] + b[3]) / 2 * s
    ring = r * 0.34
    glass = r - ring
    hole = glass * 0.38
    pts = [(cx + hole * math.cos(math.radians(60 * i - 90)), cy + hole * math.sin(math.radians(60 * i - 90))) for i in range(6)]
    lines = []
    for i in range(6):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
        bb = 2 * ((x1 - cx) * dx + (y1 - cy) * dy); c = (x1 - cx) ** 2 + (y1 - cy) ** 2 - glass ** 2
        t = (-bb + math.sqrt(bb * bb - 4 * c)) / 2
        lines.append(f'M{x1:.1f} {y1:.1f}L{x1 + dx * t:.1f} {y1 + dy * t:.1f}')
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r - ring / 2:.1f}" fill="none" stroke="#FFFFFF" stroke-width="{ring:.1f}"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{glass:.1f}" fill="url(#glass)"/>'
            f'<path d="{" ".join(lines)}" stroke="#0B2547" stroke-width="{glass * 0.07:.1f}" stroke-linecap="round"/>'
            f'<path d="M{" L".join(f"{px:.1f} {py:.1f}" for px, py in pts)}Z" fill="#0B2547"/>'
            f'<circle cx="{cx - glass * 0.42:.1f}" cy="{cy - glass * 0.42:.1f}" r="{glass * 0.15:.1f}" fill="#FFFFFF"/>')

def icon(lens_o):
    s = 0.205                      # cap height 153 px per line
    cap = CAP * s
    gap_lines = 42
    top = (512 - (2 * cap + gap_lines)) / 2
    letters = (line('RA', top + cap, s, 14) + line('TO', top + 2 * cap + gap_lines, s, 14, lens_o))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Rato">'
            f'<title>Rato</title>{DEFS}{tile()}<g filter="url(#lift)">{letters}</g></svg>\n')

open('rato-stacked.svg', 'w').write(icon(False))
open('rato-stacked-lens.svg', 'w').write(icon(True))
print('ok')
