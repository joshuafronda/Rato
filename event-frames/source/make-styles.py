import base64, math, random
HERE = __file__.rsplit('/', 1)[0] if '/' in __file__ else '.'
JAKARTA = '/home/user/Rato/node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'
FONTS = {
    'Jakarta': (JAKARTA, '200 800'),
    'Pinyon': (f'{HERE}/fonts/pinyon-script-latin-400-normal.woff2', '400'),
    'Bebas': (f'{HERE}/fonts/bebas-neue-latin-400-normal.woff2', '400'),
    'Caveat': (f'{HERE}/fonts/caveat-latin-700-normal.woff2', '700'),
}
LOGO = 'data:image/png;base64,' + base64.b64encode(open(f'{HERE}/church-logo.png', 'rb').read()).decode()
W, H = 600, 1800

def font_faces():
    import os
    return ''.join(f"@font-face {{ font-family: '{n}'; src: url('file://{os.path.abspath(p)}') format('woff2'); font-weight: {w}; }}\n"
                   for n, (p, w) in FONTS.items())

def page(windows, radius, under, over=''):
    """`under` is masked (windows cut out); `over` is drawn on top (stars, tape)."""
    holes = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="black"/>' for x, y, w, h in windows)
    return f'''<!doctype html><html><head><style>
{font_faces()}
html, body {{ margin: 0; background: transparent; }} svg {{ display: block; }}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><mask id="windows"><rect width="{W}" height="{H}" fill="white"/>{holes}</mask></defs>
<g mask="url(#windows)">{under}</g>
{over}
</svg></body></html>'''

def logo(cx, cy, r, ring, ring_width=5, clip='logoclip'):
    return (f'<clipPath id="{clip}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>'
            f'<circle cx="{cx}" cy="{cy}" r="{r + ring_width}" fill="{ring}"/>'
            f'<image href="{LOGO}" x="{cx - r * 1.04}" y="{cy - r * 1.04}" width="{r * 2.08}" height="{r * 2.08}" clip-path="url(#{clip})"/>')

def text(x, y, s, font, size, fill, anchor='middle', weight=None, extra=''):
    w = f' font-weight="{weight}"' if weight else ''
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{font}" font-size="{size}"{w} fill="{fill}" {extra}>{s}</text>'

def perimeter(x, y, w, h, r, step):
    """Points every `step` px along a rounded rectangle."""
    segs = []
    straight = [((x + r, y), (x + w - r, y)), ((x + w, y + r), (x + w, y + h - r)),
                ((x + w - r, y + h), (x + r, y + h)), ((x, y + h - r), (x, y + r))]
    corners = [(x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)]
    pts = []
    for (a, b), (cx, cy, start) in zip(straight, corners):
        length = math.dist(a, b)
        n = max(1, round(length / step))
        pts += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n)]
        arc = math.pi * r / 2
        m = max(1, round(arc / step))
        pts += [(cx + r * math.cos(math.radians(start + 90 * i / m)), cy + r * math.sin(math.radians(start + 90 * i / m))) for i in range(m)]
    return pts

def star4(x, y, s, fill, opacity=1, stroke=''):
    st = f' stroke="{stroke}" stroke-width="1.5"' if stroke else ''
    return (f'<path d="M{x} {y - s} Q{x + s * 0.16} {y - s * 0.16} {x + s} {y} Q{x + s * 0.16} {y + s * 0.16} {x} {y + s} '
            f'Q{x - s * 0.16} {y + s * 0.16} {x - s} {y} Q{x - s * 0.16} {y - s * 0.16} {x} {y - s}Z" fill="{fill}" opacity="{opacity}"{st}/>')

def star5(x, y, r, fill, stroke, rot=0):
    pts = []
    for i in range(10):
        rad = r if i % 2 == 0 else r * 0.46
        a = math.radians(rot - 90 + 36 * i)
        pts.append(f'{x + rad * math.cos(a):.1f} {y + rad * math.sin(a):.1f}')
    return f'<path d="M{" L".join(pts)}Z" fill="{fill}" stroke="{stroke}" stroke-width="2" stroke-linejoin="round"/>'

# =============== 1. Y2K Chrome ===============
def y2k():
    WIN = [(70, 330, 460, 318), (70, 690, 460, 318), (70, 1050, 460, 318)]
    R = 22
    random.seed(2000)
    stones = ''
    for x, y, w, h in WIN:
        for px, py in perimeter(x - 9, y - 9, w + 18, h + 18, R + 9, 13.5):
            stones += f'<circle cx="{px:.1f}" cy="{py:.1f}" r="6.2" fill="url(#stone)"/><circle cx="{px - 1.8:.1f}" cy="{py - 1.8:.1f}" r="1.6" fill="#FFFFFF"/>'
    def bow(cx, cy, s, rot):
        return f'''<g transform="translate({cx} {cy}) rotate({rot}) scale({s})" filter="url(#y2k-drop)">
<path d="M0 0 C-14 -22 -44 -26 -46 -6 C-48 12 -18 12 0 0Z" fill="url(#chrome-grad)" stroke="#E5E7EB" stroke-width="1.5"/>
<path d="M0 0 C14 -22 44 -26 46 -6 C48 12 18 12 0 0Z" fill="url(#chrome-grad)" stroke="#E5E7EB" stroke-width="1.5"/>
<path d="M-4 2 L-18 34 L-8 30 L-2 40 Z M4 2 L18 34 L8 30 L2 40 Z" fill="url(#chrome-grad)" stroke="#E5E7EB" stroke-width="1.2"/>
<ellipse cx="0" cy="0" rx="8" ry="9" fill="url(#chrome-grad)" stroke="#F9FAFB" stroke-width="1.5"/></g>'''
    sparkles = ''.join(star4(random.uniform(20, 580), random.uniform(20, 1780), random.uniform(3, 8), '#FFFFFF', random.uniform(0.4, 0.95)) for _ in range(40))
    under = f'''
<defs>
<filter id="liquid" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0055" numOctaves="2" seed="5"/>
  <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1"/>
  <feComponentTransfer>
    <feFuncR type="table" tableValues="0 0.02 0.9 0.15 0 0.05 1 0.35 0 0.02 0.85 0.1 0 0.6 0.05 0"/>
    <feFuncG type="table" tableValues="0 0.02 0.91 0.16 0 0.05 1 0.36 0 0.02 0.86 0.11 0 0.61 0.05 0"/>
    <feFuncB type="table" tableValues="0.01 0.04 0.97 0.2 0.01 0.07 1 0.42 0.01 0.04 0.92 0.15 0.01 0.68 0.07 0.01"/>
  </feComponentTransfer>
  <feGaussianBlur stdDeviation="1.2"/>
  <feComponentTransfer>
    <feFuncR type="gamma" exponent="1.3" amplitude="1"/><feFuncG type="gamma" exponent="1.3" amplitude="1"/><feFuncB type="gamma" exponent="1.3" amplitude="1"/>
  </feComponentTransfer>
</filter>
<radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient>
<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="dark-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.65"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="#050505"/>
<rect width="{W}" height="{H}" filter="url(#liquid)"/>
<rect width="{W}" height="{H}" fill="url(#vignette)"/>
<rect width="{W}" height="320" fill="url(#dark-panel)"/>
<rect y="1390" width="{W}" height="410" fill="#000" opacity="0.55"/>
{sparkles}
{text(44, 54, 'JTFFC', 'Jakarta', 17, '#FFFFFF', 'start', 800)}
{text(556, 54, '14th Anniversary', 'Jakarta', 17, '#FFFFFF', 'end', 800)}
<g filter="url(#glow)">
{text(300, 168, 'Knowing Christ', 'Pinyon', 70, '#FFFFFF')}
{text(300, 268, 'More', 'Pinyon', 96, '#FFFFFF')}
</g>
{logo(300, 1490, 58, '#E5E7EB', 4, 'y2k-logo')}
{text(300, 1606, 'JESUS THE FIRST FRUIT CHURCH, INC.', 'Jakarta', 19, '#FFFFFF', 'middle', 800, 'letter-spacing="1.5"')}
{text(300, 1662, '14th Church Anniversary', 'Pinyon', 40, '#E5E7EB')}
{text(44, 1756, 'fb: Jesus The First Fruit Church Inc.', 'Jakarta', 14, '#D1D5DB', 'start', 500)}
{text(556, 1756, 'Batangas City', 'Jakarta', 14, '#D1D5DB', 'end', 500)}
'''
    over = f'''
<defs>
<radialGradient id="stone" cx="0.38" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#E2E8F0"/><stop offset="0.8" stop-color="#94A3B8"/><stop offset="1" stop-color="#475569"/></radialGradient>
<linearGradient id="chrome-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.35" stop-color="#9CA3AF"/><stop offset="0.55" stop-color="#F3F4F6"/><stop offset="0.8" stop-color="#6B7280"/><stop offset="1" stop-color="#E5E7EB"/></linearGradient>
<filter id="y2k-drop" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/></filter>
</defs>
{stones}
<g filter="url(#y2k-drop)">{star5(528, 646, 30, 'url(#chrome-grad)', '#F9FAFB', 12)}{star5(72, 1012, 26, 'url(#chrome-grad)', '#F9FAFB', -10)}{star5(530, 1368, 24, 'url(#chrome-grad)', '#F9FAFB', 20)}</g>
{bow(92, 334, 0.85, -14)}{bow(514, 1052, 0.8, 12)}{bow(300, 1386, 0.7, 0)}
{star4(108, 690, 14, 'url(#chrome-grad)', 1, '#FFFFFF')}{star4(496, 334, 12, 'url(#chrome-grad)', 1, '#FFFFFF')}
'''
    return page(WIN, R, under, over)

# =============== 2. Retro Film ===============
def film():
    WIN = [(66, 320, 468, 330), (66, 684, 468, 330), (66, 1048, 468, 330)]
    AMBER = '#F5A524'
    holes = ''.join(f'<rect x="{x}" y="{y}" width="24" height="32" rx="5" fill="#E8E2D6"/>'
                    for y in range(18, 1790, 58) for x in (12, 564))
    edge_text = ''.join(
        text(0, 0, f'JTFFC 400 &#9656; {14 + i}A', 'Jakarta', 13, AMBER, 'middle', 700,
             f'transform="translate({52} {y}) rotate(-90)" letter-spacing="2"')
        + text(0, 0, f'&#9656; {14 + i}', 'Jakarta', 13, AMBER, 'middle', 700, f'transform="translate({548} {y}) rotate(90)" letter-spacing="2"')
        for i, y in enumerate((485, 849, 1213)))
    under = f'''
<defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/>
<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0"/></filter></defs>
<rect width="{W}" height="{H}" fill="#121212"/>
<rect width="{W}" height="{H}" filter="url(#grain)"/>
{holes}
<rect x="44" y="0" width="2" height="{H}" fill="#2A2A2A"/><rect x="554" y="0" width="2" height="{H}" fill="#2A2A2A"/>
{edge_text}
{text(300, 64, 'JESUS THE FIRST FRUIT CHURCH, INC.', 'Jakarta', 15, AMBER, 'middle', 800, 'letter-spacing="3"')}
{text(300, 172, 'KNOWING', 'Bebas', 112, '#F5F1E8', 'middle', None, 'letter-spacing="4"')}
{text(300, 270, 'CHRIST MORE', 'Bebas', 98, '#F5F1E8', 'middle', None, 'letter-spacing="3"')}
{text(300, 302, '14TH CHURCH ANNIVERSARY &#183; BATANGAS CITY', 'Jakarta', 13, AMBER, 'middle', 700, 'letter-spacing="2.5"')}
{logo(156, 1520, 62, AMBER, 4, 'film-logo')}
{text(232, 1500, 'SUNDAY 6:00 AM &amp; 5:00 PM', 'Bebas', 30, '#F5F1E8', 'start')}
{text(232, 1536, 'THURSDAY 5:30 PM', 'Bebas', 30, '#F5F1E8', 'start')}
{text(232, 1572, 'MORNING PRAYER MON&#8211;SAT 5 &amp; 6 AM', 'Bebas', 24, AMBER, 'start')}
<rect x="66" y="1626" width="468" height="2" fill="#2E2E2E"/>
{text(300, 1680, '&#8220;THAT I MAY KNOW HIM&#8221; &#8212; PHIL. 3:10', 'Bebas', 34, '#F5F1E8', 'middle', None, 'letter-spacing="2"')}
{text(300, 1722, 'Purok 1 Bolbok, Perez Compound, Batangas City', 'Jakarta', 14, '#A8A29E', 'middle', 500)}
{text(300, 1748, 'fb: Jesus The First Fruit Church Inc.', 'Jakarta', 14, '#A8A29E', 'middle', 500)}
'''
    over = ''.join(f'<rect x="{x - 3}" y="{y - 3}" width="{w + 6}" height="{h + 6}" rx="6" fill="none" stroke="#F5F1E8" stroke-width="3"/>' for x, y, w, h in WIN)
    return page(WIN, 4, under, over)

# =============== 3. Scrapbook ===============
def scrapbook():
    WIN = [(64, 318, 472, 324), (64, 690, 472, 324), (64, 1062, 472, 324)]
    INK = '#3B2F2F'
    def tape(cx, cy, w, h, rot, color, stripe):
        return (f'<g transform="rotate({rot} {cx} {cy})" opacity="0.88">'
                f'<rect x="{cx - w / 2}" y="{cy - h / 2}" width="{w}" height="{h}" fill="{color}"/>'
                + ''.join(f'<rect x="{cx - w / 2 + i}" y="{cy - h / 2}" width="5" height="{h}" fill="{stripe}" opacity="0.55"/>' for i in range(4, int(w) - 4, 14))
                + f'<path d="M{cx - w / 2} {cy - h / 2} l4 5 l-4 5 l4 5 l-4 5 l4 5 l-4 {h - 25}" fill="none" stroke="#F4EDE1" stroke-width="2"/></g>')
    def heart(x, y, s, color):
        return f'<path transform="translate({x} {y}) scale({s})" d="M0 6 C-10 -6 -22 4 0 20 C22 4 10 -6 0 6Z" fill="none" stroke="{color}" stroke-width="2.4" stroke-linejoin="round"/>'
    mounts = ''.join(f'<rect x="{x - 14}" y="{y - 14}" width="{w + 28}" height="{h + 28}" fill="#FFFFFF" filter="url(#paper-shadow)"/>' for x, y, w, h in WIN)
    under = f'''
<defs>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed="11"/>
<feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.10 0"/></filter>
<filter id="paper-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="2" dy="6" stdDeviation="5" flood-color="#5B4636" flood-opacity="0.28"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="#F4EDE1"/>
<rect width="{W}" height="{H}" filter="url(#paper)"/>
{text(300, 70, 'jesus the first fruit church, inc.', 'Caveat', 30, '#9A6B4F', 'middle', 700)}
{text(300, 168, 'Knowing Christ', 'Caveat', 86, INK, 'middle', 700)}
{text(300, 258, 'More', 'Caveat', 92, '#C2410C', 'middle', 700)}
<path d="M392 228 q40 -10 64 4" fill="none" stroke="#C2410C" stroke-width="3" stroke-linecap="round"/>
{heart(470, 222, 1.3, '#C2410C')}{heart(48, 150, 1.0, '#9A6B4F')}
{star4(500, 108, 12, '#E8A33D')}{star4(86, 238, 9, '#E8A33D')}
{text(300, 298, '~ 14th church anniversary ~', 'Caveat', 30, '#9A6B4F', 'middle', 700)}
{mounts}
{logo(140, 1508, 58, '#FFFFFF', 8, 'scrap-logo')}
{text(226, 1478, 'Sunday 6 AM &amp; 5 PM', 'Caveat', 32, INK, 'start', 700)}
{text(226, 1514, 'Thursday 5:30 PM', 'Caveat', 32, INK, 'start', 700)}
{text(226, 1550, 'Morning Prayer Mon&#8211;Sat', 'Caveat', 32, INK, 'start', 700)}
<path d="M120 1600 C 220 1590 380 1610 480 1596" fill="none" stroke="#C2410C" stroke-width="3" stroke-linecap="round"/>
{text(300, 1660, '&#8220;That I may know Him&#8221; &#8212; Phil. 3:10', 'Caveat', 36, '#C2410C', 'middle', 700)}
{text(300, 1712, 'Purok 1 Bolbok, Perez Compound, Batangas City', 'Caveat', 26, '#7C5C46', 'middle', 700)}
{text(300, 1746, 'fb: Jesus The First Fruit Church Inc.', 'Caveat', 26, '#7C5C46', 'middle', 700)}
{heart(300, 1772, 0.8, '#C2410C')}
'''
    over = (tape(96, 326, 110, 30, -32, '#F9C6CF', '#FFFFFF') + tape(506, 330, 110, 30, 28, '#BFE3D0', '#FFFFFF')
            + tape(300, 692, 120, 30, -4, '#FDE68A', '#FFFFFF') + tape(92, 1374, 110, 30, 30, '#C7D2FE', '#FFFFFF')
            + tape(508, 1066, 110, 30, -28, '#F9C6CF', '#FFFFFF') + tape(150, 1452, 80, 26, -20, '#FDE68A', '#FFFFFF')
            + text(462, 1434, 'us!', 'Caveat', 32, '#C2410C', 'middle', 700, 'transform="rotate(-6 462 1434)"')
            + '<path d="M492 1426 C512 1416 520 1400 516 1382 M508 1392 L516 1380 L524 1392" fill="none" stroke="#C2410C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    return page(WIN, 2, under, over)

for name, fn in (('y2k', y2k), ('film', film), ('scrapbook', scrapbook)):
    open(f'{HERE}/{name}.html', 'w').write(fn())
print('ok')
