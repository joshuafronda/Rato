import base64, random
R = '/home/user/Rato'
F = f'{R}/event-frames/source/fonts'
URL = 'https://rato-d2428.web.app/'
def data(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
QR = data('qr.svg', 'image/svg+xml')
LEFT = data(f'{R}/event-frames/knowing-christ-more-scrapbook.png', 'image/png')
RIGHT = data(f'{R}/event-frames/knowing-christ-more-y2k.png', 'image/png')
LOGO = data(f'{R}/event-frames/source/church-logo.png', 'image/png')
RATO = data(f'{R}/brand/rato-logo-white.svg', 'image/svg+xml')
JAKARTA = f'{R}/node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'

random.seed(7)
def spot():
    x = random.choice([random.uniform(20, 110), random.uniform(970, 1060)])
    return x, random.uniform(30, 1320), random.uniform(4, 12), random.uniform(.35, .9)
sparkles = ''.join(
    f'<path d="M{x} {y - s}Q{x + s * .16} {y - s * .16} {x + s} {y}Q{x + s * .16} {y + s * .16} {x} {y + s}Q{x - s * .16} {y + s * .16} {x - s} {y}Q{x - s * .16} {y - s * .16} {x} {y - s}Z" fill="#F4D589" opacity="{o:.2f}"/>'
    for x, y, s, o in [spot() for _ in range(30)])

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'Jakarta'; src: url('file://{JAKARTA}') format('woff2'); font-weight: 200 800; }}
@font-face {{ font-family: 'Pinyon'; src: url('file://{F}/pinyon-script-latin-400-normal.woff2') format('woff2'); }}
@font-face {{ font-family: 'Bebas'; src: url('file://{F}/bebas-neue-latin-400-normal.woff2') format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: 1080px; height: 1350px; }}
body {{ position: relative; overflow: hidden; font-family: 'Jakarta'; color: #fff;
  background: radial-gradient(ellipse 80% 55% at 50% 52%, #2D4C93 0%, #14284F 55%, #0A1530 100%); }}
.rays {{ position: absolute; inset: 0; background: repeating-conic-gradient(from 0deg at 50% 56%, rgba(244,213,137,.07) 0deg 6deg, transparent 6deg 18deg);
  mask-image: radial-gradient(circle at 50% 56%, #000 0%, transparent 60%); }}
svg.deco {{ position: absolute; inset: 0; }}
.top {{ position: absolute; top: 44px; width: 100%; text-align: center; }}
.church {{ font-weight: 800; font-size: 22px; letter-spacing: 6px; color: #F4D589; }}
.theme {{ font-family: 'Pinyon'; font-size: 66px; line-height: 1.05; margin-top: 8px; text-shadow: 0 0 24px rgba(255,255,255,.35); }}
.anniv {{ font-weight: 700; font-size: 19px; letter-spacing: 8px; color: #DCE3F2; }}
.headline {{ position: absolute; top: 232px; width: 100%; text-align: center; font-family: 'Bebas'; font-size: 118px;
  letter-spacing: 4px; line-height: 1; text-shadow: 0 6px 30px rgba(0,0,0,.45); }}
.strip {{ position: absolute; width: 170px; height: 510px; top: 470px; border-radius: 6px;
  background: linear-gradient(160deg, #FDE7EF 0%, #E4ECFF 50%, #FFF4D6 100%);
  box-shadow: 0 22px 40px rgba(0,0,0,.5), 0 0 0 3px rgba(255,255,255,.9); }}
.strip img {{ width: 100%; height: 100%; display: block; border-radius: 6px; }}
.strip.left {{ left: 70px; transform: rotate(-12deg); }}
.strip.right {{ right: 70px; transform: rotate(12deg); }}
.card {{ position: absolute; top: 400px; left: 50%; width: 540px; margin-left: -270px; padding: 44px 40px 40px;
  border-radius: 34px; background: #fff; text-align: center; color: #14284F;
  box-shadow: 0 30px 60px rgba(0,0,0,.45), 0 0 0 8px rgba(244,213,137,.85); z-index: 5; }}
.badge {{ position: absolute; top: -30px; left: 50%; transform: translateX(-50%) rotate(-3deg); padding: 8px 30px 2px;
  font-family: 'Bebas'; font-size: 46px; letter-spacing: 6px; color: #14284F; white-space: nowrap;
  background: linear-gradient(90deg, #F6E3A1, #D9AE52, #F2D78A); border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,.3); }}
.qr {{ display: block; width: 460px; height: 460px; margin: 10px auto 0; image-rendering: pixelated; }}
.url {{ margin-top: 8px; font-weight: 800; font-size: 26px; letter-spacing: .3px; color: #14284F; }}
.hint {{ margin-top: 4px; font-size: 16px; color: #5B6577; }}
.steps {{ position: absolute; top: 1056px; left: 70px; right: 70px; display: flex; gap: 18px; }}
.step {{ flex: 1; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px;
  background: rgba(255,255,255,.1); border: 1px solid rgba(244,213,137,.45); }}
.num {{ flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 24px;
  color: #14284F; background: linear-gradient(135deg, #F6E3A1, #D9AE52); }}
.step b {{ display: block; font-size: 20px; }}
.step span {{ display: block; font-size: 15px; color: #C9D3E3; margin-top: 2px; }}
.bottom {{ position: absolute; left: 70px; right: 70px; bottom: 40px; display: flex; align-items: center; gap: 22px; }}
.logo {{ flex: none; width: 104px; height: 104px; border-radius: 50%; background: #fff center/112% url('{LOGO}');
  box-shadow: 0 0 0 5px #F4D589, 0 10px 24px rgba(0,0,0,.4); }}
.info {{ flex: 1; }}
.thanks {{ font-family: 'Bebas'; font-size: 38px; letter-spacing: 2.5px; color: #F4D589; line-height: 1; white-space: nowrap; }}
.info p {{ font-size: 17px; color: #DCE3F2; margin-top: 6px; }}
.rato {{ flex: none; text-align: right; font-size: 13px; color: #9FB0CF; letter-spacing: 1px; }}
.rato img {{ display: block; height: 56px; margin-top: 6px; }}
</style></head><body>
<div class="rays"></div>
<svg class="deco" width="1080" height="1350">{sparkles}</svg>
<div class="top">
  <div class="church">JESUS THE FIRST FRUIT CHURCH, INC.</div>
  <div class="theme">Knowing Christ More</div>
  <div class="anniv">14TH CHURCH ANNIVERSARY</div>
</div>
<div class="headline">SEE YOUR PHOTOS!</div>
<div class="strip left"><img src="{LEFT}" alt=""></div>
<div class="strip right"><img src="{RIGHT}" alt=""></div>
<div class="card">
  <div class="badge">SCAN ME</div>
  <img class="qr" src="{QR}" alt="QR code">
</div>
<div class="steps">
  <div class="step"><div class="num">1</div><div><b>Open your camera</b><span>On any phone</span></div></div>
  <div class="step"><div class="num">2</div><div><b>Scan the QR code</b><span>Tap the link that appears</span></div></div>
  <div class="step"><div class="num">3</div><div><b>View &amp; download</b><span>Save your strips and share them</span></div></div>
</div>
<div class="bottom">
  <div class="logo"></div>
  <div class="info">
    <div class="thanks">THANK YOU FOR CELEBRATING WITH US!</div>
    <p>Purok 1 Bolbok, Perez Compound, Batangas City</p>
    <p>fb: Jesus The First Fruit Church Inc.</p>
  </div>
  <div class="rato">POWERED BY<img src="{RATO}" alt="Rato"></div>
</div>
</body></html>'''
open('qr-poster.html', 'w').write(html)
print('ok')
