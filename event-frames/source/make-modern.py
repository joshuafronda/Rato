import base64
FONT = '/home/user/Rato/node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'
LOGO = 'data:image/png;base64,' + base64.b64encode(open('church-logo.png', 'rb').read()).decode()
W, H = 600, 1800
WINDOWS = [(50, 352, 500, 336), (50, 708, 500, 336), (50, 1064, 500, 336)]
R = 18
PURPLE, DEEP, INK = '#6D3FD0', '#2E1065', '#111111'

holes = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{R}" fill="black"/>' for x, y, w, h in WINDOWS)
shadows = ''.join(f'<rect x="{x}" y="{y + 10}" width="{w}" height="{h}" rx="{R}" fill="#2E1065" opacity="0.22" filter="url(#soft)"/>' for x, y, w, h in WINDOWS)
borders = ''.join(f'<rect x="{x - 3}" y="{y - 3}" width="{w + 6}" height="{h + 6}" rx="{R + 3}" fill="#FFFFFF"/>' for x, y, w, h in WINDOWS)

def label(x, y, w, h, angle, text, size, fill, shadow=True):
    """A tilted label like the reference's 'Custom Websites' cards."""
    sh = f'<rect x="{x + 4}" y="{y + 10}" width="{w}" height="{h}" rx="8" fill="#000" opacity="0.28" filter="url(#soft)"/>' if shadow else ''
    return (f'<g transform="rotate({angle} {x + w / 2} {y + h / 2})">{sh}'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}"/>'
            f'<text x="{x + w / 2}" y="{y + h / 2 + size * 0.36}" text-anchor="middle" class="sans" font-weight="800" font-size="{size}" fill="#FFFFFF">{text}</text></g>')

body = f'''
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#F1F0F5"/><stop offset="1" stop-color="#E4E2EC"/></linearGradient>
<linearGradient id="title" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E1065"/><stop offset="1" stop-color="#4C1D95"/></linearGradient>
<linearGradient id="pill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#111111"/><stop offset="0.55" stop-color="#3B1A7A"/><stop offset="1" stop-color="#7C4DDB"/></linearGradient>
<linearGradient id="purple-card" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E1065"/><stop offset="1" stop-color="#7C4DDB"/></linearGradient>
<filter id="soft" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="streak" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
<filter id="drop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="4" dy="10" stdDeviation="8" flood-color="#2E1065" flood-opacity="0.35"/></filter>
<clipPath id="logoclip"><circle cx="478" cy="1528" r="58"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<!-- soft light streaks, like the reference's silky background -->
<path d="M-80 520 C200 380 420 700 700 420 L700 520 C420 800 200 480 -80 640Z" fill="#FFFFFF" opacity="0.9" filter="url(#streak)"/>
<path d="M-80 1300 C180 1150 420 1450 700 1250 L700 1330 C420 1530 180 1230 -80 1400Z" fill="#FFFFFF" opacity="0.85" filter="url(#streak)"/>

<text x="300" y="58" text-anchor="middle" class="sans" font-weight="600" font-size="17" fill="{DEEP}" letter-spacing="0.3">jesus the first fruit <tspan fill="{PURPLE}" font-weight="800">church</tspan></text>
<text x="300" y="148" text-anchor="middle" class="sans" font-weight="800" font-size="74" fill="url(#title)" letter-spacing="-2">Knowing</text>
<text x="300" y="226" text-anchor="middle" class="sans" font-weight="800" font-size="74" fill="url(#title)" letter-spacing="-2">Christ More<tspan fill="#7C4DDB">.</tspan></text>
<text x="300" y="266" text-anchor="middle" class="sans" font-weight="600" font-size="17" fill="{INK}">Celebrating our 14th Church Anniversary.</text>
<text x="300" y="290" text-anchor="middle" class="sans" font-weight="600" font-size="17" fill="{INK}">Jesus The First Fruit Church, Inc. · Batangas City</text>

{shadows}{borders}


<!-- footer: service-time cards, the logo badge, the pill button -->
{label(26, 1428, 320, 44, -2, 'Sunday · 6:00 AM &amp; 5:00 PM', 18, INK)}
{label(52, 1482, 300, 44, 2, 'Thursday · 5:30 PM', 19, 'url(#purple-card)')}
{label(22, 1536, 340, 44, -2, 'Morning Prayer · Mon–Sat · 5 &amp; 6 AM', 16, 'url(#purple-card)')}
<circle cx="478" cy="1528" r="63" fill="#FFFFFF" filter="url(#drop)"/>
<image href="{LOGO}" x="417.7" y="1467.7" width="120.6" height="120.6" clip-path="url(#logoclip)"/>

<g filter="url(#drop)">
<rect x="60" y="1624" width="480" height="62" rx="12" fill="url(#pill)"/>
</g>
<text x="96" y="1665" class="sans" font-weight="800" font-size="25" fill="#FFFFFF">That I may know Him</text>
<text x="96" y="1665" dx="268" class="sans" font-weight="600" font-size="15" fill="#D9CCFA">Phil. 3:10</text>
<path d="M494 1642 L516 1642 L516 1664 M516 1642 L490 1668" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

<text x="300" y="1730" text-anchor="middle" class="sans" font-weight="500" font-size="16" fill="{INK}">fb.com/Jesus The First Fruit Church Inc.</text>
<text x="300" y="1756" text-anchor="middle" class="sans" font-weight="500" font-size="15" fill="#5B6577">Purok 1 Bolbok, Perez Compound, Batangas City</text>
'''

page = f'''<!doctype html><html><head><style>
@font-face {{ font-family: 'Jakarta'; src: url('file://{FONT}') format('woff2'); font-weight: 200 800; }}
html, body {{ margin: 0; background: transparent; }} svg {{ display: block; }}
.sans {{ font-family: 'Jakarta'; }}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><mask id="windows"><rect width="{W}" height="{H}" fill="white"/>{holes}</mask></defs>
<g mask="url(#windows)">{body}</g>
{label(28, 318, 250, 46, -3, '14th Anniversary', 22, INK)}
</svg></body></html>'''
open('modern.html', 'w').write(page)
print('ok')
