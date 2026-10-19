import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
font = TTFont(sys.argv[1])
gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
# Pair kerning from GPOS (format 1 pairs) where present, so the script joins sit right.
kern = {}
try:
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            st = getattr(st, 'ExtSubTable', st)
            if getattr(st, 'Format', None) == 1 and hasattr(st, 'PairSet'):
                for first, ps in zip(st.Coverage.glyphs, st.PairSet):
                    for rec in ps.PairValueRecord:
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if v: kern[f'{first}|{rec.SecondGlyph}'] = v
except Exception as e:
    print('no kerning', e)
out = {'unitsPerEm': font['head'].unitsPerEm, 'glyphs': {}, 'kern': kern, 'names': {}}
for ch in sys.argv[3]:
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs); gs[name].draw(pen)
    b = BoundsPen(gs); gs[name].draw(b)
    out['glyphs'][ch] = {'d': pen.getCommands(), 'advance': hmtx[name][0], 'bounds': b.bounds}
    out['names'][ch] = name
json.dump(out, open(sys.argv[2], 'w'))
print(out['unitsPerEm'], len(kern), {k: v['advance'] for k, v in out['glyphs'].items()})
