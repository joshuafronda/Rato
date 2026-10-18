import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
font = TTFont(sys.argv[1])
font = instantiateVariableFont(font, {"wght": int(sys.argv[3])})
gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font['hmtx']
out = {"unitsPerEm": font['head'].unitsPerEm, "capHeight": font['OS/2'].sCapHeight, "glyphs": {}}
for ch in sys.argv[4]:
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs); gs[name].draw(pen)
    b = BoundsPen(gs); gs[name].draw(b)
    out["glyphs"][ch] = {"d": pen.getCommands(), "advance": hmtx[name][0], "bounds": b.bounds}
# Kerning is skipped; spacing is set by hand in the layout.
json.dump(out, open(sys.argv[2], "w"))
print(out["unitsPerEm"], out["capHeight"], {k: (v["advance"], v["bounds"]) for k, v in out["glyphs"].items()})
