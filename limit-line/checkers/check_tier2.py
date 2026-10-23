"""Tier 2 checker (2026-10-23): the five-level brick-breaker with pause, skip key and saved progress.

Black-box: the page is driven only through keyboard/mouse and read through what it draws (canvas fillText calls,
observed by an init script) and its DOM text. A fake clock fast-forwards time. Nine checks, one point each:
  loads, hud, score, lives, levels, win, pause, save_level, save_best
usage: python3 check_tier2.py <runs_dir> > tier2.json   (each run folder has index.html, or work/index.html)
"""
import json, os, re, sys, random, hashlib
from playwright.sync_api import sync_playwright

INIT = r"""
(() => {
  window.__texts = []; window.__arcs = [];
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText']) {
    const o = P[fn];
    P[fn] = function (t, ...r) { window.__texts.push(String(t)); if (window.__texts.length > 4000) window.__texts.splice(0, 2000); return o.call(this, t, ...r); };
  }
  const oa = P.arc;
  P.arc = function (x, y, rad, ...a) {
    if (rad >= 2 && rad <= 20) { const T = this.getTransform(); window.__arcs.push([T.a * x + T.e, T.d * y + T.f, rad, this.canvas.width, this.canvas.height]); if (window.__arcs.length > 200) window.__arcs.splice(0, 100); }
    return oa.call(this, x, y, rad, ...a);
  };
})();
"""
TXT = "(() => { const t = window.__texts.splice(0); return t.concat([document.body ? document.body.innerText : '']).join('\\n'); })()"
BALL = """(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect();
  const a = window.__arcs.splice(0).filter(v => v[1] > v[4] * 0.12); if (!a.length) return null; const b = a[a.length - 1];
  return [r.x + b[0] * r.width / b[3], r.y + b[1] * r.height / b[4], r.x, r.width, r.y + r.height, b[1] / b[4]]; })()"""
RECT = "(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()"


def nums(label, text):
    return [int(x) for x in re.findall(label + r'\s*:\s*(\d+)', text)]


class Game:
    def __init__(self, pw, path):
        self.b = pw.chromium.launch(); self.ctx = self.b.new_context(viewport={'width': 1200, 'height': 900})
        self.errors = []; self.path = path; self.open()

    def open(self):
        self.p = self.ctx.new_page(); self.p.on('pageerror', lambda e: self.errors.append(str(e)[:150]))
        self.p.add_init_script(INIT); self.p.clock.install(); self.p.goto('file://' + self.path); self.p.clock.run_for(600)

    def reload(self):
        self.p.close(); self.open()

    def text(self):
        return self.p.evaluate(TXT)

    def start(self):
        r = self.p.evaluate(RECT)
        if r: self.p.mouse.click(r[0] + r[2] / 2, r[1] + r[3] * 0.6)
        self.p.keyboard.press('Space'); self.p.clock.run_for(200)

    def tick(self, ms=100):
        self.p.clock.run_for(ms)

    def close(self):
        self.b.close()


def latest(label, t):
    v = nums(label, t)
    return v[-1] if v else None


def check(pw, path):
    res = {}
    g = Game(pw, path)
    try:
        t = g.text(); g.start(); g.tick(1500); t += '\n' + g.text()
        res['loads'] = bool(g.p.evaluate(RECT)) and not g.errors
        res['hud'] = all(nums(l, t) for l in ('Score', 'Lives', 'Level', 'Best'))
        # score: follow the ball with the mouse
        rnd = random.Random(1); best = 0
        for i in range(2500):
            b = g.p.evaluate(BALL)
            if b: g.p.mouse.move(b[0] + rnd.uniform(-10, 10), b[4] - 5)
            g.tick(100)
            if i % 10 == 0: g.p.keyboard.press('Space')
            if i % 10 == 0:
                s = nums('Score', g.text())
                if s: best = max(best, max(s))
                if best > 0 and i > 50: break
        res['score'] = best > 0
        score_seen = best
        # best score survives a reload (same browser profile)
        g.reload(); g.tick(500); t = g.text(); g.start(); g.tick(500); t += '\n' + g.text()
        bv = nums('Best', t)
        res['save_best'] = bool(bv) and max(bv) >= score_seen > 0
    finally:
        g.close()

    # lives: fresh profile, paddle parked in a corner
    g = Game(pw, path)
    try:
        g.start(); r = g.p.evaluate(RECT); seq = []; over = False
        for i in range(1500):
            if r: g.p.mouse.move(r[0] + 3, r[1] + r[3] - 5)
            g.tick(100); t = g.text(); v = latest('Lives', t)
            if v is not None and (not seq or seq[-1] != v): seq.append(v)
            if re.search(r'game\s*over', t, re.I): over = True; break
            if i % 10 == 0: g.p.keyboard.press('Space')
        res['lives'] = seq[:1] == [3] and over and (seq[-1] == 0 or (len(seq) >= 3 and seq[:3] == [3, 2, 1]))
        res['lives_seq'] = seq
    finally:
        g.close()

    # levels via N, distinct layouts, win screen; then pause
    g = Game(pw, path)
    try:
        g.start(); g.tick(300); seen = [latest('Level', g.text())]; shots = []
        r = g.p.evaluate(RECT)
        clip = {'x': r[0], 'y': r[1] + r[3] * 0.10, 'width': r[2], 'height': r[3] * 0.45} if r else {'x': 0, 'y': 0, 'width': 1200, 'height': 350}
        for k in range(4):
            g.p.keyboard.press('KeyN'); g.tick(400)
            seen.append(latest('Level', g.text()))
            shots.append(hashlib.md5(g.p.screenshot(clip=clip)).hexdigest())
            g.start(); g.tick(200)
            t = g.text(); lv = latest('Level', t)
            if lv is not None and seen[-1] is None: seen[-1] = lv
        res['levels'] = seen == [1, 2, 3, 4, 5] and len(set(shots)) == 4
        res['levels_seen'] = seen
        g.p.keyboard.press('KeyN'); g.tick(600)
        res['win'] = bool(re.search(r'you\s*win', g.text(), re.I))
    finally:
        g.close()

    g = Game(pw, path)
    try:
        g.start(); g.tick(800); g.text(); g.p.evaluate(BALL)
        g.p.keyboard.press('KeyP'); g.tick(300); t = g.text()
        g.p.evaluate("window.__arcs.splice(0)"); g.tick(1000); a1 = g.p.evaluate(BALL); g.tick(1000); a2 = g.p.evaluate(BALL)
        frozen = (a1 is None and a2 is None) or (a1 and a2 and abs(a1[0] - a2[0]) < 1 and abs(a1[1] - a2[1]) < 1)
        g.p.keyboard.press('KeyP'); g.tick(300); g.p.evaluate("window.__arcs.splice(0)"); g.tick(500); b1 = g.p.evaluate(BALL); g.tick(500); b2 = g.p.evaluate(BALL)
        moves = bool(b1 and b2 and (abs(b1[0] - b2[0]) >= 1 or abs(b1[1] - b2[1]) >= 1))
        res['pause'] = bool(re.search(r'paused', t, re.I)) and bool(frozen) and moves
        # saved level: go to level 3, reload
        g.p.keyboard.press('KeyN'); g.tick(400); g.start(); g.p.keyboard.press('KeyN'); g.tick(400); g.start(); g.tick(300)
        before = latest('Level', g.text())
        g.reload(); g.tick(500); t = g.text(); g.start(); g.tick(300); t += '\n' + g.text()
        res['save_level'] = before == 3 and latest('Level', t) == 3
    finally:
        g.close()
    res['errors'] = g.errors[:3]
    keys = ['loads', 'hud', 'score', 'lives', 'levels', 'win', 'pause', 'save_level', 'save_best']
    res['points'] = sum(bool(res[k]) for k in keys); res['max'] = len(keys)
    return res


def main():
    out = {}
    with sync_playwright() as pw:
        for d in sorted(os.listdir(sys.argv[1])):
            base = os.path.join(sys.argv[1], d)
            f = next((x for x in (os.path.join(base, 'index.html'), os.path.join(base, 'work', 'index.html')) if os.path.exists(x)), None)
            if not f: out[d] = {'points': 0, 'max': 9, 'missing': True}; continue
            try:
                out[d] = check(pw, os.path.abspath(f))
            except Exception as e:
                out[d] = {'points': 0, 'max': 9, 'crash': str(e)[:200]}
            print(d, out[d].get('points'), {k: v for k, v in out[d].items() if v is False}, file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
