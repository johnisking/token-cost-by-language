import sys,os,random
from playwright.sync_api import sync_playwright
src=open(sys.argv[1],encoding='utf-8').read(); i=src.rfind('})()')
hook="try{window.__S=()=>score;window.__LV=()=>level}catch(e){};"
src=src[:i]+hook+src[i:] if i>0 else src.replace('</script>',hook+'</script>',1)
p=os.path.join(sys.argv[2],'probe.html'); open(p,'w',encoding='utf-8').write(src)
INIT=open(sys.argv[3]).read()
with sync_playwright() as pw:
  b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':900}); pg.add_init_script(INIT); pg.clock.install()
  pg.goto('file://'+p); pg.clock.run_for(500)
  r=pg.evaluate("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
  pg.mouse.click(r[0]+r[2]/2,r[1]+r[3]*0.6); pg.keyboard.press('Space'); pg.keyboard.press('Enter')
  mx=0; rnd=random.Random(1)
  for k in range(3000):
    ball=pg.evaluate("""(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const a=window.__arcs.splice(0).filter(v=>v[1]>v[4]*0.12);if(!a.length)return null;const b=a[a.length-1];return [r.x+b[0]*r.width/b[3], r.y+r.height]})()""")
    if ball: pg.mouse.move(ball[0]+rnd.uniform(-10,10), ball[1]-5)
    pg.clock.run_for(100)
    if k%10==0: pg.keyboard.press('Space')
    if k%20==0:
      s=pg.evaluate("window.__S&&window.__S()"); mx=max(mx,s or 0)
      if mx>0 and k>200: break
  print('score max',mx,'level',pg.evaluate("window.__LV&&window.__LV()"))
  b.close()
