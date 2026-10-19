"""Headless check of every generated game: works.json maps raw/<run>/work/index.html -> {works, errors}.

A game "works" when the file loads in headless Chromium, has a <canvas>, takes mouse clicks
and arrow keys for two seconds and throws no script errors.
usage: python3 check_works.py
"""
import glob, json, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = HERE


def check(page, path):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)[:200]))
    page.goto('file://' + path)
    page.wait_for_timeout(500)
    has_canvas = page.evaluate('!!document.querySelector("canvas")')
    box = page.evaluate('(() => { const c = document.querySelector("canvas"); if (!c) return null; const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()')
    if box:
        page.mouse.click(box[0], box[1])
        page.mouse.move(box[0] - 80, box[1])
    for k in ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'Enter']:
        page.keyboard.down(k); page.wait_for_timeout(300); page.keyboard.up(k)
    page.wait_for_timeout(500)
    return dict(works=bool(has_canvas) and not errors, errors=errors)


def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for f in sorted(glob.glob(os.path.join(RAW, 'runs', '*', 'work', 'index.html'), recursive=True)):
            page = b.new_page()
            out[os.path.relpath(f, RAW).replace(os.sep, '/')] = check(page, f)
            page.close()
        b.close()
    json.dump(out, open(os.path.join(HERE, 'works.json'), 'w'), indent=1)
    print(sum(v['works'] for v in out.values()), 'of', len(out), 'work')
    for k, v in out.items():
        if not v['works']:
            print('FAIL', k, v['errors'])


if __name__ == '__main__':
    main()
