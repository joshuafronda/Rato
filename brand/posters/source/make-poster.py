import base64, random
R = '/home/user/Rato'
F = f'{R}/event-frames/source/fonts'
def data(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
STRIPS = ['scrapbook', 'film', 'y2k', 'sky-hills', '']
strip_urls = [data(f'{R}/event-frames/knowing-christ-more{"-" + s if s else ""}.png', 'image/png') for s in STRIPS]
LOGO = data(f'{R}/event-frames/source/church-logo.png', 'image/png')
RATO = data(f'{R}/brand/rato-logo-white.svg', 'image/svg+xml')
JAKARTA = f'{R}/node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'

# The fan of strips: (left, top, rotation) in poster px. Each strip is 600x1800 shown at 0.3.
FAN = [(160, 525, -16), (305, 500, -8), (457, 488, 0), (609, 500, 8), (754, 525, 16)]
random.seed(18)
# Sparkles only in the side margins and around the strips, never on the words.
def spot():
    x = random.choice([random.uniform(20, 110), random.uniform(970, 1060), random.uniform(120, 960)])
    y = random.uniform(30, 1320) if (x < 110 or x > 970) else random.uniform(470, 1010)
    return x, y, random.uniform(4, 12), random.uniform(.35, .9)
SPOTS = [spot() for _ in range(40)]
sparkles = ''.join(
    f'<path d="M{x} {y - s}Q{x + s * .16} {y - s * .16} {x + s} {y}Q{x + s * .16} {y + s * .16} {x} {y + s}Q{x - s * .16} {y + s * .16} {x - s} {y}Q{x - s * .16} {y - s * .16} {x} {y - s}Z" fill="#F4D589" opacity="{o:.2f}"/>'
    for x, y, s, o in SPOTS)

strips = ''.join(f'''
<div class="strip" style="left:{x}px;top:{y}px;transform:rotate({r}deg);z-index:{10 - abs(i - 2)}">
  <img src="{url}" alt="">
</div>''' for i, ((x, y, r), url) in enumerate(zip(FAN, strip_urls)))

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'Jakarta'; src: url('file://{JAKARTA}') format('woff2'); font-weight: 200 800; }}
@font-face {{ font-family: 'Pinyon'; src: url('file://{F}/pinyon-script-latin-400-normal.woff2') format('woff2'); }}
@font-face {{ font-family: 'Bebas'; src: url('file://{F}/bebas-neue-latin-400-normal.woff2') format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: 1080px; height: 1350px; }}
body {{ position: relative; overflow: hidden; font-family: 'Jakarta'; color: #fff;
  background: radial-gradient(ellipse 80% 55% at 50% 42%, #2D4C93 0%, #14284F 55%, #0A1530 100%); }}
.rays {{ position: absolute; inset: 0; background: repeating-conic-gradient(from 0deg at 50% 46%, rgba(244,213,137,.07) 0deg 6deg, transparent 6deg 18deg);
  mask-image: radial-gradient(circle at 50% 46%, #000 0%, transparent 62%); }}
svg.deco {{ position: absolute; inset: 0; }}
.top {{ position: absolute; top: 46px; width: 100%; text-align: center; }}
.church {{ font-weight: 800; font-size: 22px; letter-spacing: 6px; color: #F4D589; }}
.theme {{ font-family: 'Pinyon'; font-size: 74px; line-height: 1.05; margin-top: 10px; text-shadow: 0 0 24px rgba(255,255,255,.35); }}
.anniv {{ font-weight: 700; font-size: 20px; letter-spacing: 8px; color: #DCE3F2; margin-top: 2px; }}
.headline {{ position: absolute; z-index: 30; top: 246px; width: 100%; text-align: center; font-family: 'Bebas'; line-height: .9; }}
.headline .big {{ font-size: 132px; letter-spacing: 4px; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,.45); }}
.headline .today {{ display: inline-block; margin-top: 8px; padding: 8px 34px 2px; font-size: 64px; letter-spacing: 6px;
  color: #14284F; background: linear-gradient(90deg, #F6E3A1, #D9AE52, #F2D78A); border-radius: 14px; transform: rotate(-2deg);
  box-shadow: 0 10px 28px rgba(0,0,0,.35); }}
.strip {{ position: absolute; width: 166px; height: 498px; transform-origin: 50% 100%;
  background: linear-gradient(160deg, #FDE7EF 0%, #E4ECFF 50%, #FFF4D6 100%); border-radius: 6px;
  box-shadow: 0 22px 40px rgba(0,0,0,.5), 0 0 0 3px rgba(255,255,255,.9); }}
.strip img {{ width: 100%; height: 100%; display: block; border-radius: 6px; }}
.steps {{ position: absolute; top: 1050px; left: 70px; right: 70px; display: flex; gap: 18px; }}
.step {{ flex: 1; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px;
  background: rgba(255,255,255,.1); border: 1px solid rgba(244,213,137,.45); backdrop-filter: blur(4px); }}
.num {{ flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 24px;
  color: #14284F; background: linear-gradient(135deg, #F6E3A1, #D9AE52); }}
.step b {{ display: block; font-size: 21px; }}
.step span {{ display: block; font-size: 15px; color: #C9D3E3; margin-top: 2px; }}
.bottom {{ position: absolute; left: 70px; right: 70px; bottom: 42px; display: flex; align-items: center; gap: 22px; }}
.logo {{ flex: none; width: 108px; height: 108px; border-radius: 50%; background: #fff center/112% url('{LOGO}');
  box-shadow: 0 0 0 5px #F4D589, 0 10px 24px rgba(0,0,0,.4); }}
.info {{ flex: 1; }}
.free {{ font-family: 'Bebas'; font-size: 40px; white-space: nowrap; letter-spacing: 3px; color: #F4D589; line-height: 1; }}
.info p {{ font-size: 17px; color: #DCE3F2; margin-top: 6px; }}
.rato {{ flex: none; text-align: right; font-size: 13px; color: #9FB0CF; letter-spacing: 1px; }}
.rato img {{ display: block; height: 58px; margin-top: 6px; }}
</style></head><body>
<div class="rays"></div>
<svg class="deco" width="1080" height="1350">{sparkles}</svg>
<div class="top">
  <div class="church">JESUS THE FIRST FRUIT CHURCH, INC.</div>
  <div class="theme">Knowing Christ More</div>
  <div class="anniv">14TH CHURCH ANNIVERSARY</div>
</div>
<div class="headline"><div class="big">PHOTO BOOTH</div><div class="today">IS OPEN TODAY!</div></div>
{strips}
<div class="steps">
  <div class="step"><div class="num">1</div><div><b>Pick a frame</b><span>8 anniversary designs</span></div></div>
  <div class="step"><div class="num">2</div><div><b>Strike a pose</b><span>3 shots, retake any</span></div></div>
  <div class="step"><div class="num">3</div><div><b>Print or scan</b><span>Take it home or to your phone</span></div></div>
</div>
<div class="bottom">
  <div class="logo"></div>
  <div class="info">
    <div class="free">FREE FOR EVERYONE · COME JOIN US!</div>
    <p>Purok 1 Bolbok, Perez Compound, Batangas City</p>
    <p>fb: Jesus The First Fruit Church Inc.</p>
  </div>
  <div class="rato">POWERED BY<img src="{RATO}" alt="Rato"></div>
</div>
</body></html>'''
open('poster.html', 'w').write(html)
print('ok')
