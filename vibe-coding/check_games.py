"""Headless checks for the vibe-coding dataset. Writes works.json.

brick: same check as the earlier datasets: loads, has a <canvas>, takes clicks and keys for 2 s, no script errors.
2048: six scored checks on the page as a player would see it:
  loads    - no script errors while loading and playing
  tiles    - after load, the page shows 2 or 3 tiles with value 2 or 4 inside a 4x4 board of elements
  moves    - arrow keys change the tiles
  spawn    - the number of tiles or their sum grows over 40 moves
  score    - a number labelled score goes up
  newgame  - clicking a "New Game" button resets the board to 2 or 3 small tiles
  rules    - 30 more moves: each board must equal the expected slide/merge result plus exactly one new 2 or 4
  works    = all six checks pass and no rule violations
sudoku: loads, 81 inputs, 3 puzzles valid and each with exactly one solution (counted by a solver),
  Check marks a wrong digit, Solve fills a valid grid matching the givens, New Puzzle changes the givens.
usage: python3 check_games.py runs_dir
"""
import glob, json, os, re, sys
from playwright.sync_api import sync_playwright

RUNS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "runs")

BOARD_JS = r"""
() => {
  // collect leaf elements whose whole text is a power of two >= 2
  const vals = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    if (el.closest('h1,h2,h3,header,title,button,a')) continue;
    const t = (el.textContent || '').trim();
    if (!/^\d{1,5}$/.test(t)) continue;
    const n = +t;
    if (n < 2 || (n & (n - 1))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    // skip numbers that sit inside a score/best box
    let p = el, scoreish = false;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      const idc = ((p.id || '') + ' ' + (p.className && p.className.baseVal !== undefined ? p.className.baseVal : p.className || '')).toLowerCase();
      if (/score|best|high/.test(idc)) { scoreish = true; break; }
    }
    if (!scoreish) vals.push(n);
  }
  return vals;
}
"""
SCORE_JS = r"""
() => {
  const txt = document.body.innerText;
  const m = txt.match(/score[^0-9]{0,12}(\d+)/i);
  if (m) return +m[1];
  for (const el of document.querySelectorAll('[id*=score i],[class*=score i]')) {
    const d = (el.textContent || '').match(/\d+/); if (d) return +d[0];
  }
  return null;
}
"""

GRID_JS = r"""
() => {
  const tiles = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    if (el.closest('h1,h2,h3,header,title,button,a')) continue;
    const t = (el.textContent || '').trim();
    if (!/^\d{1,5}$/.test(t)) continue;
    const n = +t; if (n < 2 || (n & (n - 1))) continue;
    let p = el, scoreish = false;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      const idc = ((p.id || '') + ' ' + (typeof p.className === 'string' ? p.className : '')).toLowerCase();
      if (/score|best|high/.test(idc)) { scoreish = true; break; }
    }
    if (scoreish) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 10) continue;
    tiles.push([el, n, r]);
  }
  if (!tiles.length) return null;
  const tr = tiles[0][2];
  let b = tiles[0][0];
  while (b && b.getBoundingClientRect().width < 3.2 * tr.width) b = b.parentElement;
  if (!b) return null;
  const br = b.getBoundingClientRect();
  const g = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for (const [el, n, r] of tiles) {
    const c = Math.floor((r.left + r.width / 2 - br.left) / (br.width / 4));
    const w = Math.floor((r.top + r.height / 2 - br.top) / (br.height / 4));
    if (c < 0 || c > 3 || w < 0 || w > 3) return null;
    if (g[w][c]) return null;
    g[w][c] = n;
  }
  return g;
}
"""


def slide(row):
    v = [x for x in row if x]; out = []; i = 0
    while i < len(v):
        if i + 1 < len(v) and v[i] == v[i + 1]:
            out.append(v[i] * 2); i += 2
        else:
            out.append(v[i]); i += 1
    return out + [0] * (4 - len(out))


def expect(g, key):
    T = lambda m: [list(r) for r in zip(*m)]
    if key == 'ArrowLeft':
        return [slide(r) for r in g]
    if key == 'ArrowRight':
        return [slide(r[::-1])[::-1] for r in g]
    if key == 'ArrowUp':
        return T([slide(r) for r in T(g)])
    return T([slide(r[::-1])[::-1] for r in T(g)])


def rule_ok(before, after, key):
    e = expect(before, key)
    if e == before:
        return after == before
    diff = [(i, j) for i in range(4) for j in range(4) if e[i][j] != after[i][j]]
    return len(diff) == 1 and e[diff[0][0]][diff[0][1]] == 0 and after[diff[0][0]][diff[0][1]] in (2, 4)


def check_brick(page, path, errors):
    page.goto('file://' + path); page.wait_for_timeout(500)
    has_canvas = page.evaluate('!!document.querySelector("canvas")')
    box = page.evaluate('(() => { const c = document.querySelector("canvas"); if (!c) return null; const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()')
    if box:
        page.mouse.click(box[0], box[1]); page.mouse.move(box[0] - 80, box[1])
    for k in ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'Enter']:
        page.keyboard.down(k); page.wait_for_timeout(300); page.keyboard.up(k)
    page.wait_for_timeout(500)
    return dict(works=bool(has_canvas) and not errors, errors=errors[:3])


def check_2048(page, path, errors):
    page.goto('file://' + path); page.wait_for_timeout(600)
    res = {}
    v0 = page.evaluate(BOARD_JS)
    res['tiles'] = 2 <= len(v0) <= 3 and all(v in (2, 4) for v in v0)
    s0 = page.evaluate(SCORE_JS)
    page.mouse.click(5, 5)
    seq = ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'] * 10
    changed = False; prev = v0
    for i, k in enumerate(seq):
        page.keyboard.press(k); page.wait_for_timeout(160)
        cur = page.evaluate(BOARD_JS)
        if i < 4 and sorted(cur) != sorted(prev):
            changed = True
        prev = cur
    v1 = page.evaluate(BOARD_JS)
    res['moves'] = changed
    res['spawn'] = sum(v1) > sum(v0) + 10
    s1 = page.evaluate(SCORE_JS)
    res['score'] = s0 is not None and s1 is not None and s1 > s0
    btn = None
    for loc in [page.get_by_role('button', name=re.compile('new game|restart|new', re.I)),
                page.get_by_text(re.compile(r'^\s*(new game|restart)\s*$', re.I))]:
        try:
            if loc.count():
                btn = loc.first; break
        except Exception:
            pass
    res['newgame'] = False
    if btn:
        try:
            btn.click(timeout=2000); page.wait_for_timeout(400)
            v2 = page.evaluate(BOARD_JS)
            res['newgame'] = 2 <= len(v2) <= 3 and all(v in (2, 4) for v in v2)
        except Exception:
            pass
    # strict rules: every move must give exactly the expected board plus one new 2 or 4
    try:
        btn and btn.click(timeout=2000)
    except Exception:
        pass
    page.wait_for_timeout(400)
    ok = bad = unread = 0
    g = page.evaluate(GRID_JS)
    for k in ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown'] * 5:
        page.keyboard.press(k); page.wait_for_timeout(450)
        g2 = page.evaluate(GRID_JS)
        if g is None or g2 is None:
            unread += 1
        elif rule_ok(g, g2, k):
            ok += 1
        else:
            bad += 1
        g = g2
    res['rule_moves_ok'] = ok; res['rule_moves_bad'] = bad; res['rule_moves_unread'] = unread
    res['loads'] = not errors
    res['points'] = sum(bool(res[k]) for k in ('loads', 'tiles', 'moves', 'spawn', 'score', 'newgame'))
    res['works'] = res['points'] == 6 and res.get('rule_moves_bad') == 0 and res.get('rule_moves_unread') == 0
    res['errors'] = errors[:3]
    res['final_sum'] = sum(v1)
    return res


READ_SUDOKU = r"""
() => {
  const ins = [...document.querySelectorAll('input')].filter(i => { const r = i.getBoundingClientRect(); return r.width > 5 && r.height > 5; });
  if (ins.length < 81) return null;
  const cells = ins.slice(0, 81).map(i => ({v: (i.value || '').trim(), ro: i.readOnly || i.disabled}));
  return cells;
}
"""


def sud_ok_partial(g):
    for k in range(9):
        for vals in ([g[k][j] for j in range(9)], [g[j][k] for j in range(9)],
                     [g[3 * (k // 3) + a][3 * (k % 3) + b] for a in range(3) for b in range(3)]):
            v = [x for x in vals if x]
            if len(v) != len(set(v)):
                return False
    return True


def count_solutions(g, limit=2):
    g = [r[:] for r in g]
    def cand(i, j):
        used = set(g[i]) | {g[r][j] for r in range(9)} | {g[3 * (i // 3) + a][3 * (j // 3) + b] for a in range(3) for b in range(3)}
        return [d for d in range(1, 10) if d not in used]
    n = 0
    def rec():
        nonlocal n
        best = None
        for i in range(9):
            for j in range(9):
                if not g[i][j]:
                    c = cand(i, j)
                    if best is None or len(c) < len(best[2]):
                        best = (i, j, c)
        if best is None:
            n += 1; return n >= limit
        i, j, c = best
        for d in c:
            g[i][j] = d
            if rec():
                return True
        g[i][j] = 0
        return False
    rec()
    return n


def grid_of(cells, givens_only):
    g = [[0] * 9 for _ in range(9)]
    for k, c in enumerate(cells):
        if (not givens_only or c['ro']) and c['v'].isdigit() and len(c['v']) == 1 and c['v'] != '0':
            g[k // 9][k % 9] = int(c['v'])
    return g


def check_sudoku(page, path, errors):
    page.goto('file://' + path); page.wait_for_timeout(1500)
    res = dict(grid=False, puzzles_valid=0, puzzles_unique=0, solve_ok=False, check_marks=False, new_differs=False)
    seen = []
    def btn(rx):
        loc = page.get_by_role('button', name=re.compile(rx, re.I))
        return loc.first if loc.count() else None
    for k in range(3):
        cells = page.evaluate(READ_SUDOKU)
        if not cells:
            break
        res['grid'] = True
        giv = grid_of(cells, True)
        ng = sum(1 for r in giv for x in r if x)
        if 17 <= ng <= 70 and sud_ok_partial(giv):
            res['puzzles_valid'] += 1
            if count_solutions(giv) == 1:
                res['puzzles_unique'] += 1
        seen.append(giv)
        if k == 0:
            # type a wrong digit into the first empty cell and press Check
            ins = page.locator('input')
            empty = next((i for i, c in enumerate(cells) if not c['ro'] and not c['v']), None)
            b = btn(r'check')
            if empty is not None and b:
                sol = None
                if count_solutions(giv) >= 1:
                    gg = [r[:] for r in giv]
                    # solve to know a wrong digit
                    def solve(g):
                        for i in range(9):
                            for j in range(9):
                                if not g[i][j]:
                                    for d in range(1, 10):
                                        g[i][j] = d
                                        if sud_ok_partial(g) and solve(g):
                                            return True
                                    g[i][j] = 0
                                    return False
                        return True
                    if solve(gg):
                        sol = gg
                if sol:
                    i, j = divmod(empty, 9)
                    wrong = next(d for d in range(1, 10) if d != sol[i][j])
                    before = ins.nth(empty).evaluate('e => getComputedStyle(e).backgroundColor + getComputedStyle(e).color + e.className')
                    ins.nth(empty).fill(str(wrong)); b.click(); page.wait_for_timeout(300)
                    after = ins.nth(empty).evaluate('e => getComputedStyle(e).backgroundColor + getComputedStyle(e).color + e.className')
                    res['check_marks'] = before != after
                    ins.nth(empty).fill('')
            b = btn(r'solve')
            if b:
                b.click(); page.wait_for_timeout(500)
                full = grid_of(page.evaluate(READ_SUDOKU) or [], False)
                res['solve_ok'] = all(all(r) for r in full) and sud_ok_partial(full) and all(
                    not giv[i][j] or giv[i][j] == full[i][j] for i in range(9) for j in range(9))
        b = btn(r'new')
        if not b:
            break
        b.click(); page.wait_for_timeout(2500)
    res['new_differs'] = len(seen) >= 2 and seen[0] != seen[1]
    res['loads'] = not errors
    res['points'] = sum([res['loads'], res['grid'], res['puzzles_valid'] == 3, res['puzzles_unique'] == 3, res['solve_ok'], res['check_marks'], res['new_differs']])
    res['works'] = res['points'] == 7
    res['errors'] = errors[:3]
    return res


def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for f in sorted(glob.glob(os.path.join(RUNS, '*', 'work', 'index.html'))):
            run = os.path.basename(os.path.dirname(os.path.dirname(f)))
            page = b.new_page(viewport={'width': 1000, 'height': 800}); errors = []
            page.on('pageerror', lambda e, errors=errors: errors.append(str(e)[:200]))
            try:
                out[run] = (check_2048 if run.startswith('2048') else check_sudoku if run.startswith('sudoku') else check_brick)(page, f, errors)
            except Exception as e:
                out[run] = dict(works=False, errors=[f'checker: {e}'[:200]])
            page.close()
        b.close()
    json.dump(out, open(os.path.join(os.path.dirname(RUNS), 'works.json'), 'w'), indent=1)
    for k, v in out.items():
        print(k, v.get('points', ''), v['works'], v.get('errors'))


if __name__ == '__main__':
    main()
