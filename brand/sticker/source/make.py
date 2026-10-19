import json
F = json.load(open('glyphs.json'))
G, KERN, NAMES = F['glyphs'], F['kern'], F['names']

PALETTES = {
    'lime': ['#D7FF4A', '#9BE22D', '#3DBE29'],                       # like the reference
    'holo': ['#22D3EE', '#3B82F6', '#7C3AED', '#E879F9'],             # the new Rato colours
}

def layout(text):
    """Glyph paths placed along the baseline in font units, with Pacifico's pair kerning."""
    parts, x = [], 0
    for i, ch in enumerate(text):
        g = G[ch]
        parts.append(f'<path transform="translate({x} 0)" d="{g["d"]}"/>')
        x += g['advance']
        if i + 1 < len(text):
            x += KERN.get(f'{NAMES[ch]}|{NAMES[text[i + 1]]}', 0)
    ys = [v for ch in text if G[ch]['bounds'] for v in (G[ch]['bounds'][1], G[ch]['bounds'][3])]
    return ''.join(parts), x, min(ys), max(ys)

def sticker(text, palette, ink='#FFFFFF', edge='#0E0E14', scale=0.22, tilt=-6):
    word, width, low, high = layout(text)
    outer, middle = 196, 128            # stroke widths in font units: dark edge, colour outline
    pad = outer + 70
    w = (width + 2 * pad) * scale
    h = (high - low + 2 * pad) * scale + 70        # extra room for the tilt
    stops = ''.join(f'<stop offset="{i / (len(palette) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(palette))
    # Font units are y-up: flip, and put the baseline so the word sits in the middle.
    place = f'translate({pad * scale:.1f} {(high + pad) * scale + 35:.1f}) scale({scale} {-scale})'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Rato Co.">
<title>Rato Co.</title>
<defs>
  <linearGradient id="outline" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{w:.0f}" y2="{h:.0f}">{stops}</linearGradient>
  <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{ink}"/><stop offset="1" stop-color="#E9EEF8"/></linearGradient>
  <filter id="drop" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity="0.45"/></filter>
  <g id="word">{word}</g>
  <!-- The colour outline as a mask, so one gradient sweeps across the whole word. -->
  <mask id="outline-shape" maskUnits="userSpaceOnUse" x="0" y="0" width="{w:.0f}" height="{h:.0f}">
    <g transform="rotate({tilt} {w / 2:.0f} {h / 2:.0f})"><g transform="{place}">
      <use href="#word" fill="#fff" stroke="#fff" stroke-width="{middle}" stroke-linejoin="round" stroke-linecap="round"/>
    </g></g>
  </mask>
</defs>
<g transform="rotate({tilt} {w / 2:.0f} {h / 2:.0f})">
  <g transform="{place}">
    <use href="#word" fill="{edge}" stroke="{edge}" stroke-width="{outer}" stroke-linejoin="round" stroke-linecap="round" filter="url(#drop)"/>
  </g>
</g>
<rect width="{w:.0f}" height="{h:.0f}" fill="url(#outline)" mask="url(#outline-shape)"/>
<g transform="rotate({tilt} {w / 2:.0f} {h / 2:.0f})"><g transform="{place}">
  <use href="#word" fill="url(#face)"/>
</g></g>
</svg>
'''

for text, slug in (('RATO Co.', 'rato-co'), ('Rato Co.', 'rato-co-script')):
    for name, palette in PALETTES.items():
        open(f'{slug}-{name}.svg', 'w').write(sticker(text, palette))
print('ok')
