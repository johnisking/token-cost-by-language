"""Tier 3 checker (2026-10-23): the multi-file expense tracker.

Each run folder is served by a local static server and checked in headless Chromium. Hidden tests, one point each:
  files, loads, csv_parse, csv_roundtrip, summary, add_row, delete, filter, import, export, persist, chart
usage: python3 check_tier3.py <runs_dir> > tier3.json   (each run folder holds the app, or work/ holds it)
"""
import functools, http.server, json, os, re, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright

CSV_IN = 'date,description,amount,category\n2026-10-01,Salary,3000,Income\n2026-10-02,"Coffee, beans",-12.5,Food\n2026-10-03,"Say ""hi"" card",-7.25,Gifts\n'
ITEMS = [{"date": "2026-10-01", "description": "Rent, October", "amount": -800, "category": "Home"},
         {"date": "2026-10-02", "description": 'Book "AI"', "amount": -20.5, "category": "Fun"},
         {"date": "2026-10-03", "description": "Salary", "amount": 2500, "category": "Income"}]

JS_TESTS = r"""async (args) => {
  const [csvIn, items] = args; const out = {};
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const norm = r => ({date: String(r.date), description: String(r.description), amount: Number(r.amount), category: String(r.category)});
  try {
    const m = await import('/js/csv.js');
    const p = (m.parseCSV(csvIn) || []).map(norm);
    out.csv_parse = p.length === 3 && p[1].description === 'Coffee, beans' && p[1].amount === -12.5 && typeof m.parseCSV(csvIn)[1].amount === 'number'
                    && p[2].description === 'Say "hi" card' && p[0].category === 'Income';
    const back = (m.parseCSV(m.toCSV(items)) || []).map(norm);
    out.csv_roundtrip = eq(back, items.map(norm));
  } catch (e) { out.csv_error = String(e).slice(0, 150); }
  try {
    const s = await import('/js/summary.js');
    const r = s.summarize(items);
    const close = (a, b) => Math.abs(Number(a) - b) < 1e-6;
    out.summary = close(r.income, 2500) && close(r.expense, 820.5) && close(r.balance, 1679.5)
                  && r.byCategory && close(r.byCategory.Home, -800) && close(r.byCategory.Fun, -20.5) && close(r.byCategory.Income, 2500);
  } catch (e) { out.summary_error = String(e).slice(0, 150); }
  return out;
}"""


def serve(root):
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=root)
    srv = socketserver.TCPServer(('127.0.0.1', 0), h); threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def rows(p):
    return p.evaluate("""() => { const l = document.querySelector('#list'); if (!l) return [];
      let rs = [...l.querySelectorAll('tr')]; if (!rs.length) rs = [...l.querySelectorAll('li')]; if (!rs.length) rs = [...l.querySelectorAll('.row, [data-id]')].filter(x => x.tagName !== 'BUTTON');
      return rs.filter(r => r.offsetParent !== null && !r.querySelector('th') && r.innerText.trim()).map(r => r.innerText.trim()); }""")


def fill_tx(p, date, desc, amount, cat):
    for sel, val in (('#date', date), ('#description', desc), ('#amount', str(amount))):
        p.fill(sel, val)
    tag = p.evaluate("document.querySelector('#category')?.tagName")
    if tag == 'SELECT':
        opts = p.evaluate("[...document.querySelector('#category').options].map(o => o.value)")
        p.select_option('#category', cat if cat in opts else opts[min(1, len(opts) - 1)])
    else:
        p.fill('#category', cat)
    p.click('#add'); p.wait_for_timeout(150)


def balance(p):
    t = p.evaluate("document.querySelector('#balance')?.innerText || ''")
    m = re.search(r'-?[\d,]+\.\d{2}', t)
    return m.group(0).replace(',', '') if m else None


def check(pw, root):
    res = {}
    res['files'] = all(os.path.exists(os.path.join(root, f)) for f in ('index.html', 'styles.css', 'js/csv.js', 'js/summary.js'))
    srv = serve(root); base = f'http://127.0.0.1:{srv.server_address[1]}'
    b = pw.chromium.launch(); ctx = b.new_context(accept_downloads=True); p = ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:150]))
    try:
        p.goto(base + '/index.html'); p.wait_for_timeout(800)
        res['loads'] = not errs
        res.update(p.evaluate(JS_TESTS, [CSV_IN, ITEMS]))
        for k in ('csv_parse', 'csv_roundtrip', 'summary'): res.setdefault(k, False)
        p.evaluate("localStorage.clear()"); p.reload(); p.wait_for_timeout(500)
        try:
            fill_tx(p, '2026-10-05', 'Paycheck', 1000, 'Income')
            fill_tx(p, '2026-10-06', 'Groceries', -250.5, 'Food')
            r = rows(p)
            res['add_row'] = any('Paycheck' in x for x in r) and any('Groceries' in x for x in r) and balance(p) == '749.50'
        except Exception as e:
            res['add_row'] = False; res['add_error'] = str(e)[:150]
        try:
            fill_tx(p, '2026-10-07', 'Cinema', -30, 'Fun')
            n0 = len(rows(p))
            p.evaluate("""() => { const r = [...document.querySelectorAll('#list .delete')].find(b => (b.closest('tr') || b.closest('li') || b.closest('.row') || (b.parentElement && b.parentElement.closest('[data-id]')) || b.parentElement).innerText.includes('Cinema')); r && r.click(); }""")
            p.wait_for_timeout(200)
            r = rows(p)
            res['delete'] = len(r) == n0 - 1 and not any('Cinema' in x for x in r) and balance(p) == '749.50'
        except Exception as e:
            res['delete'] = False; res['delete_error'] = str(e)[:150]
        try:
            opts = p.evaluate("[...document.querySelector('#filter').options].map(o => [o.value, o.text])")
            food = next(v for v, t in opts if 'Food' in (v + t))
            p.select_option('#filter', food); p.wait_for_timeout(200); r = rows(p)
            ok = len(r) >= 1 and all('Groceries' in x for x in r) and any(re.fullmatch(r'\s*all\b.*', t, re.I) or v.strip().lower() == 'all' for v, t in opts)
            allv = next(v for v, t in opts if re.fullmatch(r'\s*all\b.*', t, re.I) or v.strip().lower() == 'all')
            p.select_option('#filter', allv); p.wait_for_timeout(200)
            res['filter'] = ok and len(rows(p)) >= 2
        except Exception as e:
            res['filter'] = False; res['filter_error'] = str(e)[:150]
        try:
            tmp = os.path.join(tempfile.mkdtemp(), 'import.csv'); open(tmp, 'w').write(CSV_IN)
            p.set_input_files('#import', tmp); p.wait_for_timeout(500)
            r = rows(p)
            res['import'] = any('Coffee, beans' in x for x in r) and any('Say "hi" card' in x for x in r)
        except Exception as e:
            res['import'] = False; res['import_error'] = str(e)[:150]
        try:
            with p.expect_download(timeout=3000) as dl:
                p.click('#export')
            txt = open(dl.value.path(), encoding='utf-8').read()
            res['export'] = txt.lower().startswith('date,description,amount,category') and 'Groceries' in txt and 'Paycheck' in txt
        except Exception as e:
            res['export'] = False; res['export_error'] = str(e)[:150]
        try:
            res['chart'] = p.evaluate("""() => { const c = document.querySelector('canvas#chart'); if (!c || !c.width) return false;
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const c0 = [d[0], d[1], d[2], d[3]]; let diff = 0;
              for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - c0[0]) + Math.abs(d[i+1] - c0[1]) + Math.abs(d[i+2] - c0[2]) + Math.abs(d[i+3] - c0[3]) > 30) diff++;
              return diff > 200; }""")
        except Exception as e:
            res['chart'] = False; res['chart_error'] = str(e)[:150]
        try:
            n = len(rows(p)); p.reload(); p.wait_for_timeout(800); r = rows(p)
            res['persist'] = n >= 2 and len(r) == n and any('Groceries' in x for x in r)
        except Exception as e:
            res['persist'] = False; res['persist_error'] = str(e)[:150]
    finally:
        b.close(); srv.shutdown()
    res['errors'] = errs[:3]
    keys = ['files', 'loads', 'csv_parse', 'csv_roundtrip', 'summary', 'add_row', 'delete', 'filter', 'import', 'export', 'persist', 'chart']
    res['points'] = sum(bool(res.get(k)) for k in keys); res['max'] = len(keys)
    return res


def main():
    out = {}
    with sync_playwright() as pw:
        for d in sorted(os.listdir(sys.argv[1])):
            base = os.path.join(sys.argv[1], d)
            root = os.path.join(base, 'work') if os.path.exists(os.path.join(base, 'work', 'index.html')) else base
            if not os.path.exists(os.path.join(root, 'index.html')):
                out[d] = {'points': 0, 'max': 12, 'missing': True}; continue
            try:
                out[d] = check(pw, os.path.abspath(root))
            except Exception as e:
                out[d] = {'points': 0, 'max': 12, 'crash': str(e)[:200]}
            print(d, out[d].get('points'), {k: v for k, v in out[d].items() if v is False}, file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
