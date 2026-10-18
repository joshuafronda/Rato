import base64, math, random
FONT = '/home/user/Rato/node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'
LOGO = 'data:image/png;base64,' + base64.b64encode(open('church-logo.png', 'rb').read()).decode()
W, H = 600, 1800
# Three photo windows (x, y, w, h). Photos show through these holes.
WINDOWS = [(40, 300, 520, 372), (40, 692, 520, 372), (40, 1084, 520, 372)]
R = 16

def holes():
    return ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{R}" fill="black"/>' for x, y, w, h in WINDOWS)

def borders(color, width):
    return ''.join(
        f'<rect x="{x - width / 2}" y="{y - width / 2}" width="{w + width}" height="{h + width}" rx="{R + width / 2}" fill="none" stroke="{color}" stroke-width="{width}"/>'
        for x, y, w, h in WINDOWS)

def logo(cx, cy, r, ring):
    return (f'<clipPath id="logoclip"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>'
            f'<circle cx="{cx}" cy="{cy}" r="{r + 5}" fill="{ring}"/>'
            f'<image href="{LOGO}" x="{cx - r * 1.04}" y="{cy - r * 1.04}" width="{r * 2.08}" height="{r * 2.08}" clip-path="url(#logoclip)"/>')

def sparkle(x, y, s, color, opacity=1):
    return (f'<path d="M{x} {y - s} Q{x + s * 0.18} {y - s * 0.18} {x + s} {y} Q{x + s * 0.18} {y + s * 0.18} {x} {y + s} '
            f'Q{x - s * 0.18} {y + s * 0.18} {x - s} {y} Q{x - s * 0.18} {y - s * 0.18} {x} {y - s}Z" fill="{color}" opacity="{opacity}"/>')

def cross(cx, cy, s, color):
    return (f'<rect x="{cx - s * 0.09}" y="{cy - s / 2}" width="{s * 0.18}" height="{s}" rx="{s * 0.04}" fill="{color}"/>'
            f'<rect x="{cx - s * 0.32}" y="{cy - s * 0.24}" width="{s * 0.64}" height="{s * 0.18}" rx="{s * 0.04}" fill="{color}"/>')

def page(svg_body):
    return f'''<!doctype html><html><head><style>
@font-face {{ font-family: 'Jakarta'; src: url('file://{FONT}') format('woff2'); font-weight: 200 800; }}
html, body {{ margin: 0; background: transparent; }}
svg {{ display: block; }}
.sans {{ font-family: 'Jakarta'; }}
.serif {{ font-family: 'Caladea', 'Charter', serif; }}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><mask id="windows"><rect width="{W}" height="{H}" fill="white"/>{holes()}</mask></defs>
<g mask="url(#windows)">{svg_body}</g>
</svg></body></html>'''

def footer_text(color, sub, y0):
    return (f'<text x="388" y="{y0}" text-anchor="middle" class="sans" font-weight="800" font-size="25" fill="{color}" letter-spacing="0.5">JESUS THE FIRST FRUIT</text>'
            f'<text x="388" y="{y0 + 31}" text-anchor="middle" class="sans" font-weight="800" font-size="25" fill="{color}" letter-spacing="0.5">CHURCH, INC.</text>'
            f'<text x="388" y="{y0 + 66}" text-anchor="middle" class="sans" font-weight="500" font-size="17" fill="{sub}">Purok 1 Bolbok, Perez Compound</text>'
            f'<text x="388" y="{y0 + 90}" text-anchor="middle" class="sans" font-weight="700" font-size="17" fill="{sub}" letter-spacing="2">BATANGAS CITY</text>')

# ---------- 1. Morning Light ----------
def morning_light():
    gold, navy, cream = '#C59A3D', '#14284F', '#FBF6EA'
    rays = ''.join(
        f'<path d="M300 -40 L{300 + 1400 * math.cos(math.radians(a - 3))} {-40 + 1400 * math.sin(math.radians(a - 3))} '
        f'L{300 + 1400 * math.cos(math.radians(a + 3))} {-40 + 1400 * math.sin(math.radians(a + 3))}Z" fill="#F3D98B" opacity="0.28"/>'
        for a in range(20, 170, 12))
    return f'''
<defs><linearGradient id="ml-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8E6"/><stop offset="1" stop-color="{cream}"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#ml-bg)"/>
{rays}
<rect x="14" y="14" width="572" height="1772" rx="22" fill="none" stroke="{gold}" stroke-width="3"/>
<rect x="22" y="22" width="556" height="1756" rx="16" fill="none" stroke="{gold}" stroke-width="1" opacity="0.6"/>
{cross(300, 70, 56, gold)}
<text x="300" y="138" text-anchor="middle" class="sans" font-weight="700" font-size="15" fill="{navy}" letter-spacing="3">JESUS THE FIRST FRUIT CHURCH, INC.</text>
<text x="300" y="200" text-anchor="middle" class="sans" font-weight="800" font-size="47" fill="{navy}" letter-spacing="-0.5">KNOWING CHRIST</text>
<text x="300" y="248" text-anchor="middle" class="sans" font-weight="800" font-size="47" fill="{navy}" letter-spacing="-0.5">MORE</text>
<path d="M150 236 H232 M368 236 H450" stroke="{gold}" stroke-width="2"/>
<text x="300" y="282" text-anchor="middle" class="serif" font-style="italic" font-size="21" fill="{gold}">14th Church Anniversary</text>
{borders(gold, 5)}
<text x="300" y="1500" text-anchor="middle" class="serif" font-style="italic" font-size="25" fill="{navy}">“That I may know Him”</text>
<text x="300" y="1526" text-anchor="middle" class="sans" font-weight="700" font-size="13" fill="{gold}" letter-spacing="3">PHILIPPIANS 3:10</text>
<path d="M60 1556 H540" stroke="{gold}" stroke-width="1.5" opacity="0.7"/>
{logo(130, 1666, 78, gold)}
{footer_text(navy, '#5B6577', 1630)}
{sparkle(512, 1760, 9, gold)}{sparkle(88, 1762, 7, gold)}
'''

# ---------- 2. Navy & Gold ----------
def navy_gold():
    random.seed(14)
    stars = ''.join(sparkle(random.uniform(20, 580), random.uniform(10, 1790), random.uniform(3, 9), '#F1D27A', random.uniform(0.35, 0.95))
                    for _ in range(70))
    return f'''
<defs>
<linearGradient id="ng-bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#0B1838"/><stop offset="0.5" stop-color="#14284F"/><stop offset="1" stop-color="#0B1838"/></linearGradient>
<linearGradient id="ng-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E3A1"/><stop offset="0.5" stop-color="#D4A84B"/><stop offset="1" stop-color="#F2D78A"/></linearGradient>
<radialGradient id="ng-glow" cx="0.5" cy="0.08" r="0.5"><stop offset="0" stop-color="#3A5BA8" stop-opacity="0.55"/><stop offset="1" stop-color="#3A5BA8" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#ng-bg)"/>
<rect width="{W}" height="{H}" fill="url(#ng-glow)"/>
{stars}
<rect x="12" y="12" width="576" height="1776" rx="20" fill="none" stroke="url(#ng-gold)" stroke-width="3"/>
<text x="300" y="66" text-anchor="middle" class="sans" font-weight="700" font-size="15" fill="#DCE3F2" letter-spacing="3">JESUS THE FIRST FRUIT CHURCH, INC.</text>
<path d="M90 86 H510" stroke="url(#ng-gold)" stroke-width="1.5"/>
<text x="300" y="154" text-anchor="middle" class="sans" font-weight="800" font-size="56" fill="url(#ng-gold)" letter-spacing="1">KNOWING</text>
<text x="300" y="214" text-anchor="middle" class="sans" font-weight="800" font-size="56" fill="url(#ng-gold)" letter-spacing="1">CHRIST MORE</text>
<text x="300" y="262" text-anchor="middle" class="serif" font-size="22" fill="#FFFFFF" letter-spacing="4">14TH CHURCH ANNIVERSARY</text>
{borders('#FFFFFF', 6)}
{borders('url(#ng-gold)', 2)}
<path d="M90 1500 H510" stroke="url(#ng-gold)" stroke-width="1.5"/>
{cross(300, 1500, 30, '#F1D27A')}
<text x="300" y="1550" text-anchor="middle" class="serif" font-style="italic" font-size="22" fill="#F1D27A">“That I may know Him” · Phil. 3:10</text>
{logo(130, 1670, 78, '#F1D27A')}
{footer_text('#FFFFFF', '#C9D3E3', 1634)}
'''

# ---------- 3. Sky & Hills ----------
def sky_hills():
    def cloud(x, y, s, o=1):
        return (f'<g fill="#FFFFFF" opacity="{o}"><ellipse cx="{x}" cy="{y}" rx="{46 * s}" ry="{24 * s}"/>'
                f'<circle cx="{x - 18 * s}" cy="{y - 14 * s}" r="{22 * s}"/><circle cx="{x + 14 * s}" cy="{y - 22 * s}" r="{28 * s}"/></g>')
    return f'''
<defs>
<linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EC8F2"/><stop offset="0.6" stop-color="#BFE6FB"/><stop offset="1" stop-color="#E8F7FF"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sh-sky)"/>
<circle cx="520" cy="80" r="46" fill="#FFE27A"/><circle cx="520" cy="80" r="66" fill="#FFE27A" opacity="0.3"/>
{cloud(90, 70, 1.1)}{cloud(250, 40, 0.7, 0.9)}{cloud(560, 640, 0.6, 0.8)}{cloud(30, 1040, 0.7, 0.8)}
<text x="300" y="128" text-anchor="middle" class="sans" font-weight="700" font-size="15" fill="#14284F" letter-spacing="3">JESUS THE FIRST FRUIT CHURCH, INC.</text>
<text x="300" y="186" text-anchor="middle" class="sans" font-weight="800" font-size="48" fill="#14284F">Knowing Christ</text>
<text x="300" y="234" text-anchor="middle" class="sans" font-weight="800" font-size="48" fill="#14284F">More</text>
<text x="300" y="270" text-anchor="middle" class="serif" font-style="italic" font-size="20" fill="#2C5BD0">14th Church Anniversary</text>
{borders('#FFFFFF', 8)}
<path d="M0 1520 C120 1470 220 1480 320 1515 S520 1560 600 1500 V1800 H0Z" fill="#C5E07F"/>
<path d="M0 1580 C140 1530 260 1570 360 1590 S540 1600 600 1560 V1800 H0Z" fill="#8BA400"/>
<path d="M0 1650 C160 1620 300 1660 420 1650 S560 1630 600 1640 V1800 H0Z" fill="#6E8A00"/>
{logo(130, 1690, 76, '#FFFFFF')}
{footer_text('#FFFFFF', '#F1F7DA', 1654)}
'''

for name, fn in (('morning-light', morning_light), ('navy-gold', navy_gold), ('sky-hills', sky_hills)):
    open(f'{name}.html', 'w').write(page(fn()))
print('ok')
