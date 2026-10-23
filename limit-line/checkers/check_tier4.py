"""Tier 4 checker (2026-10-23): the multi-view budget app.

Ten hidden module tests (imported in the page) and thirteen UI tests in headless Chromium, one point each.
usage: python3 check_tier4.py <runs_dir> > tier4.json   (each run folder holds the app, or work/ holds it)
"""
import json, os, re, sys, tempfile
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_tier3 import serve, rows, balance  # same helpers

MOD_TESTS = r'''async () => {
  const out = {}; const J = x => JSON.stringify(x);
  const norm = r => ({date: String(r.date), description: String(r.description), amount: Number(r.amount), category: String(r.category)});
  const close = (a, b) => Math.abs(Number(a) - b) < 1e-6;
  const t = async (k, f) => { try { out[k] = !!(await f()); } catch (e) { out[k] = false; out[k + '_error'] = String(e).slice(0, 120); } };
  const csv = await import('/js/csv.js').catch(e => ({}));
  await t('csv_basic', () => { const p = csv.parseCSV('date,description,amount,category\n2026-01-02,"Coffee, beans",-3.5,Food\n2026-01-03,"Say ""hi""",10,Gift\n').map(norm);
    return p.length === 2 && p[0].description === 'Coffee, beans' && p[0].amount === -3.5 && p[1].description === 'Say "hi"'; });
  await t('csv_multiline_crlf', () => { const p = csv.parseCSV('date,description,amount,category\r\n2026-01-02,"two\r\nlines",-1,A\r\n2026-01-03,plain,2,B\r\n').map(norm);
    return p.length === 2 && p[0].description.replace(/\r\n/g, '\n') === 'two\nlines' && p[1].category === 'B' && p[1].amount === 2; });
  await t('csv_roundtrip', () => { const it = [{date: '2026-02-01', description: 'A, "B"\nC', amount: -12.25, category: 'X'}, {date: '2026-02-02', description: 'D', amount: 7, category: 'Y'}];
    return J(csv.parseCSV(csv.toCSV(it)).map(norm).map(r => ({...r, description: r.description.replace(/\r\n/g, '\n')}))) === J(it); });
  const sm = await import('/js/summary.js').catch(e => ({}));
  const items = [{date: '2026-03-01', description: 'Pay', amount: 2000, category: 'Income'}, {date: '2026-03-05', description: 'Rent', amount: -800, category: 'Home'},
                 {date: '2026-04-02', description: 'Food', amount: -50.5, category: 'Food'}, {date: '2026-04-30', description: 'Gym', amount: -30, category: 'Fun'}];
  await t('summary_all', () => { const r = sm.summarize(items); return close(r.income, 2000) && close(r.expense, 880.5) && close(r.balance, 1119.5) && close(r.byCategory.Food, -50.5); });
  await t('summary_range', () => { const r = sm.summarize(items, {from: '2026-04-01', to: '2026-04-30'}); return close(r.income, 0) && close(r.expense, 80.5) && !('Home' in r.byCategory && r.byCategory.Home); });
  const rc = await import('/js/recurring.js').catch(e => ({}));
  await t('recur_week', () => { const r = rc.expandRecurring({date: '2026-02-24', description: 'W', amount: -5, category: 'C', every: 'week'}, '2026-03-17');
    return J(r.map(x => x.date)) === J(['2026-02-24', '2026-03-03', '2026-03-10', '2026-03-17']) && r.every(x => !('every' in x) && x.amount === -5); });
  await t('recur_month_end', () => { const r = rc.expandRecurring({date: '2026-01-31', description: 'M', amount: -9, category: 'C', every: 'month'}, '2026-05-15');
    return J(r.map(x => x.date)) === J(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']); });
  const bd = await import('/js/budget.js').catch(e => ({}));
  await t('budget', () => { const r = bd.checkBudgets(items.concat([{date: '2026-03-20', description: 'More food', amount: -60, category: 'Food'}]), [{category: 'Food', limit: 50}, {category: 'Home', limit: 1000}], '2026-04');
    return r.length === 2 && r[0].category === 'Food' && close(r[0].spent, 50.5) && r[0].over === true && r[1].category === 'Home' && close(r[1].spent, 0) && r[1].over === false; });
  const hs = await import('/js/history.js').catch(e => ({}));
  await t('history', () => { const h = hs.createHistory([]); h.push([1]); h.push([1, 2]); h.undo(); const a = J(h.state()) === J([1]) && h.canRedo(); h.redo();
    const b = J(h.state()) === J([1, 2]); h.undo(); h.push([9]); return a && b && !h.canRedo() && J(h.state()) === J([9]) && h.canUndo(); });
  await t('history_limit', () => { const h = hs.createHistory(0); for (let i = 1; i <= 60; i++) h.push(i); let n = 0; while (h.canUndo() && n < 100) { h.undo(); n++; } return n === 50 && h.state() === 10; });
  return out;
}'''


def visible(p, sel):
    return p.evaluate(f"(() => {{ const e = document.querySelector('{sel}'); if (!e) return null; const s = getComputedStyle(e); return !(e.hidden || s.display === 'none' || s.visibility === 'hidden' || e.offsetParent === null && s.position !== 'fixed'); }})()")


def add_tx(p, date, desc, amount, cat, repeat=None, until=None):
    p.fill('#date', date); p.fill('#description', desc); p.fill('#amount', str(amount))
    if p.evaluate("document.querySelector('#category')?.tagName") == 'SELECT':
        opts = p.evaluate("[...document.querySelector('#category').options].map(o => o.value)")
        p.select_option('#category', cat if cat in opts else opts[-1])
    else:
        p.fill('#category', cat)
    if repeat:
        p.select_option('#repeat', repeat)
        if until: p.fill('#until', until)
    elif p.query_selector('#repeat'):
        try: p.select_option('#repeat', 'none')
        except Exception: pass
    p.click('#add'); p.wait_for_timeout(200)


def table_rows(p, sel):
    return p.evaluate(f"""() => {{ const t = document.querySelector('{sel}'); if (!t) return [];
      return [...t.querySelectorAll('tr')].filter(r => !r.querySelector('th') && r.innerText.trim() && r.offsetParent !== null).map(r => ({{text: r.innerText.trim(), cls: r.className}})); }}""")


def check(pw, root):
    res = {}
    srv = serve(root); base = f'http://127.0.0.1:{srv.server_address[1]}'
    b = pw.chromium.launch(); ctx = b.new_context(accept_downloads=True); p = ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:150]))
    p.on('dialog', lambda d: d.accept())
    def T(k, f):
        try: res[k] = bool(f())
        except Exception as e: res[k] = False; res[k + '_error'] = str(e)[:150]
    try:
        p.goto(base + '/index.html'); p.wait_for_timeout(800)
        res.update(p.evaluate(MOD_TESTS))
        p.evaluate("localStorage.clear()"); p.goto(base + '/index.html#/transactions'); p.reload(); p.wait_for_timeout(600)

        def views():
            p.click('#nav-budgets'); p.wait_for_timeout(200); a = visible(p, '#view-budgets') and not visible(p, '#view-transactions') and not visible(p, '#view-reports') and 'budgets' in p.url
            p.click('#nav-reports'); p.wait_for_timeout(200); c = visible(p, '#view-reports') and not visible(p, '#view-budgets')
            p.goto(base + '/index.html#/transactions'); p.wait_for_timeout(300); d = visible(p, '#view-transactions') and not visible(p, '#view-reports')
            return a and c and d
        T('views', views)

        def add_row():
            add_tx(p, '2026-04-01', 'Paycheck', 1000, 'Income'); add_tx(p, '2026-04-03', 'Groceries', -250.5, 'Food')
            r = rows(p); return any('Paycheck' in x for x in r) and any('Groceries' in x for x in r) and balance(p) == '749.50'
        T('add_row', add_row)

        def delete():
            add_tx(p, '2026-04-04', 'Cinema', -30, 'Fun'); n0 = len(rows(p))
            p.evaluate("""() => { const b = [...document.querySelectorAll('#list .delete')].find(b => (b.closest('tr') || b.parentElement).innerText.includes('Cinema')); b && b.click(); }""")
            p.wait_for_timeout(200); r = rows(p); return len(r) == n0 - 1 and not any('Cinema' in x for x in r) and balance(p) == '749.50'
        T('delete', delete)

        def undo_redo():
            p.click('#undo'); p.wait_for_timeout(200); a = any('Cinema' in x for x in rows(p))
            p.click('#redo'); p.wait_for_timeout(200); c = not any('Cinema' in x for x in rows(p))
            p.click('#undo'); p.wait_for_timeout(200); p.click('#undo'); p.wait_for_timeout(200); d = not any('Cinema' in x for x in rows(p))
            p.click('#redo'); p.wait_for_timeout(200); p.click('#redo'); p.wait_for_timeout(200); e = not any('Cinema' in x for x in rows(p)) and balance(p) == '749.50'
            return a and c and d and e
        T('undo_redo', undo_redo)

        def recurring():
            n0 = len(rows(p)); add_tx(p, '2026-01-31', 'Phone bill', -20, 'Bills', 'month', '2026-04-30'); r = rows(p)
            got = [x for x in r if 'Phone bill' in x]
            return len(r) == n0 + 4 and len(got) == 4 and any('2026-02-28' in x for x in got) and any('2026-04-30' in x for x in got)
        T('recurring', recurring)

        def search():
            n0 = len(rows(p)); p.fill('#search', 'GROC'); p.wait_for_timeout(300); r = rows(p); ok = len(r) == 1 and 'Groceries' in r[0]
            p.fill('#search', ''); p.wait_for_timeout(300); return ok and n0 >= 3 and len(rows(p)) == n0
        T('search', search)

        def sort():
            p.click('#sort-amount'); p.wait_for_timeout(300)
            vals = [float(m.group(0).replace(',', '')) for x in rows(p) for m in [re.search(r'-?\d[\d,]*\.\d{2}', x)] if m]
            return len(vals) >= 3 and vals == sorted(vals, reverse=True)
        T('sort', sort)

        def imp():
            tmp = os.path.join(tempfile.mkdtemp(), 'in.csv')
            open(tmp, 'w', newline='').write('date,description,amount,category\r\n2026-04-10,"Book, used",-15,Fun\r\n2026-04-11,"Say ""hi""",-5,Gift\r\n')
            p.set_input_files('#import', tmp); p.wait_for_timeout(500); r = rows(p)
            return any('Book, used' in x for x in r) and any('Say "hi"' in x for x in r)
        T('import', imp)

        def exp():
            with p.expect_download(timeout=3000) as dl:
                p.click('#export')
            t = open(dl.value.path(), encoding='utf-8').read()
            return t.lower().lstrip('﻿').startswith('date,description,amount,category') and 'Groceries' in t and 'Phone bill' in t
        T('export', exp)

        def budgets():
            p.click('#nav-budgets'); p.wait_for_timeout(200)
            for cat, lim in (('Food', 200), ('Fun', 100)):
                p.fill('#budget-category', cat); p.fill('#budget-limit', str(lim)); p.click('#budget-add'); p.wait_for_timeout(200)
            p.fill('#budget-month', '2026-04'); p.dispatch_event('#budget-month', 'change'); p.wait_for_timeout(300)
            r = table_rows(p, '#budgets'); food = [x for x in r if 'Food' in x['text']]; fun = [x for x in r if 'Fun' in x['text']]
            return (len(food) == 1 and '250.5' in food[0]['text'] and 'over' in food[0]['cls'].split()
                    and len(fun) == 1 and re.search(r'\b15(\.00)?\b', fun[0]['text']) and 'over' not in fun[0]['cls'].split())
        T('budgets', budgets)

        def report():
            p.click('#nav-reports'); p.wait_for_timeout(200)
            p.fill('#report-month', '2026-02'); p.dispatch_event('#report-month', 'change'); p.wait_for_timeout(300)
            r = table_rows(p, '#report'); a = any('Bills' in x['text'] and '-20.00' in x['text'].replace('−', '-') for x in r) and not any('Food' in x['text'] for x in r)
            p.fill('#report-month', '2026-04'); p.dispatch_event('#report-month', 'change'); p.wait_for_timeout(300)
            r = table_rows(p, '#report'); c = any('Food' in x['text'] and '250.50' in x['text'] for x in r) and any('Income' in x['text'] and '1000.00' in x['text'] for x in r)
            return a and c
        T('report', report)

        def chart():
            return p.evaluate("""() => { const c = document.querySelector('canvas#chart'); if (!c || !c.width) return false;
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const c0 = [d[0], d[1], d[2], d[3]]; let diff = 0;
              for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - c0[0]) + Math.abs(d[i+1] - c0[1]) + Math.abs(d[i+2] - c0[2]) + Math.abs(d[i+3] - c0[3]) > 30) diff++;
              return diff > 200; }""")
        T('chart', chart)

        def persist():
            p.goto(base + '/index.html#/transactions'); p.wait_for_timeout(200); n = len(rows(p)); p.reload(); p.wait_for_timeout(800); r = rows(p)
            p.click('#nav-budgets'); p.wait_for_timeout(200); bud = table_rows(p, '#budgets')
            return n >= 4 and len(r) == n and any('Food' in x['text'] for x in bud) and any('Fun' in x['text'] for x in bud)
        T('persist', persist)
    finally:
        b.close(); srv.shutdown()
    res['errors'] = errs[:3]
    keys = ['csv_basic', 'csv_multiline_crlf', 'csv_roundtrip', 'summary_all', 'summary_range', 'recur_week', 'recur_month_end', 'budget', 'history', 'history_limit',
            'views', 'add_row', 'delete', 'undo_redo', 'recurring', 'search', 'sort', 'import', 'export', 'budgets', 'report', 'chart', 'persist']
    for k in keys: res.setdefault(k, False)
    res['points'] = sum(bool(res[k]) for k in keys); res['max'] = len(keys)
    return res


def main():
    out = {}
    with sync_playwright() as pw:
        for d in sorted(os.listdir(sys.argv[1])):
            base = os.path.join(sys.argv[1], d)
            root = os.path.join(base, 'work') if os.path.exists(os.path.join(base, 'work', 'index.html')) else base
            if not os.path.exists(os.path.join(root, 'index.html')):
                out[d] = {'points': 0, 'max': 23, 'missing': True}; continue
            try:
                out[d] = check(pw, os.path.abspath(root))
            except Exception as e:
                out[d] = {'points': 0, 'max': 23, 'crash': str(e)[:200]}
            print(d, out[d].get('points'), [k for k, v in out[d].items() if v is False], file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
