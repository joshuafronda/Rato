import json
G = json.load(open('glyphs.json'))['glyphs']
TAG = json.load(open('tagline.json'))['glyphs']   # P H O T B at weight 700


def outlined(text, x, base, s, fill, tracking):
    """Text as glyph outlines, so it looks the same without the font installed."""
    out, cursor = [], 0
    for ch in text:
        if ch == ' ':
            cursor += 260 + tracking
            continue
        out.append(f'<path transform="matrix({s} 0 0 {-s} {x + cursor * s:.1f} {base:.1f})" d="{TAG[ch]["d"]}" fill="{fill}"/>')
        cursor += TAG[ch]['advance'] + tracking
    return ''.join(out)

CAP = 745

def defs(uid):
    """The holographic mesh: soft colour blobs, blurred together inside the tile."""
    return f'''<defs>
  <clipPath id="{uid}-clip"><rect width="512" height="512" rx="116"/></clipPath>
  <filter id="{uid}-mesh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="58"/></filter>
  <radialGradient id="{uid}-gloss" cx="0.3" cy="0.18" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="{uid}-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.65"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0.35"/></linearGradient>
  <filter id="{uid}-letter" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#2A1270" flood-opacity="0.35"/></filter>
</defs>'''

def tile(uid):
    blobs = [  # (cx, cy, r, colour)
        (70, 60, 230, '#22D3EE'), (440, 40, 210, '#3B82F6'), (300, 250, 200, '#7C3AED'),
        (40, 430, 220, '#E879F9'), (470, 470, 230, '#34D399'), (230, 520, 150, '#A78BFA'),
    ]
    circles = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>' for x, y, r, c in blobs)
    return f'''<g clip-path="url(#{uid}-clip)">
  <rect width="512" height="512" fill="#6D5BFF"/>
  <g filter="url(#{uid}-mesh)">{circles}</g>
  <rect width="512" height="512" fill="url(#{uid}-gloss)"/>
</g>
<rect x="3" y="3" width="506" height="506" rx="113" fill="none" stroke="url(#{uid}-edge)" stroke-width="6"/>'''

def letter_r(uid, size=512):
    o = G['R']['bounds']            # x0, y0, x1, y1 in font units
    s = 300 / CAP                   # cap height 300 px in a 512 tile
    w = (o[2] - o[0]) * s
    x = (size - w) / 2 - o[0] * s + 6   # optical centre: R's leg makes it look left-heavy
    base = (size + 300) / 2
    return f'<path filter="url(#{uid}-letter)" transform="matrix({s:.5f} 0 0 {-s:.5f} {x:.1f} {base:.1f})" d="{G["R"]["d"]}" fill="#FFFFFF"/>'

def icon(uid='i'):
    return defs(uid) + tile(uid) + letter_r(uid)

def wordmark(x, base, s, fill, kerns=((0, 'R', 10), (0, 'A', -40), (0, 'T', -30), (0, 'O', 0))):
    out, cursor = [], 0
    for _, ch, k in kerns:
        out.append(f'<path transform="matrix({s} 0 0 {-s} {x + cursor * s:.1f} {base:.1f})" d="{G[ch]["d"]}" fill="{fill}"/>')
        cursor += G[ch]['advance'] + k
    return ''.join(out), cursor * s

def svg(w, h, body, title='Rato'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

# 1. Icon.
open('rato-icon.svg', 'w').write(svg(512, 512, icon()))

# 2. Lockups: icon + RATO (+ PHOTO BOOTH), dark and white.
def lockup(ink, sub):
    scale = 0.36                       # icon drawn at 184 px
    size = 512 * scale
    s = 0.15                           # wordmark cap = 112 px
    cap = CAP * s
    text_x = size + 34
    base = 14 + cap                    # wordmark top 14 px below the icon's top
    wm, wm_w = wordmark(text_x, base, s, ink)
    tag = outlined('PHOTO BOOTH', text_x + 3, size - 12, 24 / 1000, sub, 395)
    body = f'<g transform="scale({scale})">{icon("l")}</g>' + wm + tag
    return svg(text_x + wm_w + 10, size, body, 'Rato photo booth')
open('rato-logo.svg', 'w').write(lockup('#1B1446', '#6B6790'))
open('rato-logo-white.svg', 'w').write(lockup('#FFFFFF', '#C9C3F2'))

# 3. Gradient wordmark: one gradient across the whole word, seen through the letters.
wm, wm_w = wordmark(6, CAP * 0.2 + 6, 0.2, '#FFFFFF')
W3, H3 = wm_w + 12, CAP * 0.2 + 16
body = f'''<defs>
<linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{W3:.0f}" y2="{H3:.0f}">
<stop offset="0" stop-color="#22D3EE"/><stop offset="0.3" stop-color="#3B82F6"/><stop offset="0.55" stop-color="#7C3AED"/>
<stop offset="0.8" stop-color="#E879F9"/><stop offset="1" stop-color="#34D399"/></linearGradient>
<mask id="letters" maskUnits="userSpaceOnUse" x="0" y="0" width="{W3:.0f}" height="{H3:.0f}">{wm}</mask></defs>
<rect width="{W3:.0f}" height="{H3:.0f}" fill="url(#holo)" mask="url(#letters)"/>'''
open('rato-wordmark-gradient.svg', 'w').write(svg(W3, H3, body))
print('ok')
