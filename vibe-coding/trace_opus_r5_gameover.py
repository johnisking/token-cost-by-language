"""Trace for brick_opus-5-5_r5 (2026-10-21): records every change of (lives, state) until game over.

The archived game is not changed: a temporary copy gets one added line before its closure ends that
exposes `lives` and `state`. Space is pressed only while the game waits to serve, so the restart key
cannot hide the zero. Result: (3, play) -> (2, serve) -> (2, play) -> (1, serve) -> (1, play) -> (0, gameover).

usage: python3 trace_opus_r5_gameover.py [screenshot.png]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw', 'runs', 'brick_opus-5-5_r5', 'work', 'index.html')
src = open(path, encoding='utf-8').read(); i = src.rfind('})()')
src = src[:i] + "try{window.__L=()=>lives;window.__S=()=>state}catch(e){};" + src[i:]
probe = os.path.join(tempfile.mkdtemp(), 'probe.html'); open(probe, 'w', encoding='utf-8').write(src)
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1200, 'height': 900}); p.clock.install()
    p.goto('file://' + probe); p.clock.run_for(500)
    r = p.evaluate("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
    p.mouse.click(r[0] + r[2] / 2, r[1] + r[3] * 0.6); p.keyboard.press('Space')
    seq = []
    for k in range(900):                       # up to 90 s of game time, paddle parked in a corner
        p.mouse.move(r[0] + 3, r[1] + r[3] - 5); p.clock.run_for(100)
        v = p.evaluate("[window.__L(), window.__S()]")
        if not seq or seq[-1] != v: seq.append(v)
        if v[1] == 'gameover': break
        if v[1] == 'serve': p.keyboard.press('Space')
    if len(sys.argv) > 1: p.screenshot(path=sys.argv[1])
    b.close()
print(' -> '.join(f'({l}, {s})' for l, s in seq))
