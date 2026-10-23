"""Tier 5A checker (2026-10-23): fix and extend an existing budget app.

Three groups, one point per check:
  bugs (6)        the six reported bugs, each tested on its own
  features (9)    edit (3), rename (3), report change column (3)
  regression (23) the tier-4 hidden tests, run unchanged on the result
usage: python3 check_tier5a.py <runs_dir> > tier5a.json   (each run folder holds the app, or work/ holds it)
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_tier3 import serve, rows, balance
from check_tier4 import add_tx, table_rows, visible, check as check_tier4

BUG_MODS = r'''async () => {
  const out = {}; const J = x => JSON.stringify(x);
  const t = async (k, f) => { try { out[k] = !!(await f()); } catch (e) { out[k] = false; out[k + '_error'] = String(e).slice(0, 120); } };
  const rc = await import('/js/recurring.js').catch(e => ({}));
  await t('bug1_month_end', () => { const r = rc.expandRecurring({date: '2026-01-31', description: 'Rent', amount: -900, category: 'Home', every: 'month'}, '2026-06-30');
    return J(r.map(x => x.date)) === J(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']); });
  const csv = await import('/js/csv.js').catch(e => ({}));
  await t('bug2_csv_linebreak', () => {
    const a = csv.parseCSV('date,description,amount,category\n2026-01-02,"two\nlines",-1,A\n2026-01-03,plain,2,B\n');
    const b = csv.parseCSV('date,description,amount,category\r\n2026-01-02,"x\r\ny",-1,A\r\n2026-01-03,z,2,B\r\n');
    return a.length === 2 && a[0].description === 'two\nlines' && a[1].category === 'B' && Number(a[1].amount) === 2
        && b.length === 2 && b[0].description.replace(/\r\n/g, '\n') === 'x\ny' && b[1].description === 'z'; });
  const bd = await import('/js/budget.js').catch(e => ({}));
  await t('bug4_refund', () => { const r = bd.checkBudgets([{date: '2026-04-02', description: 'Shop', amount: -50, category: 'Food'},
      {date: '2026-04-10', description: 'Refund', amount: 30, category: 'Food'}], [{category: 'Food', limit: 100}], '2026-04');
    return r.length === 1 && Math.abs(Number(r[0].spent) - 50) < 1e-6 && r[0].over === false; });
  return out;
}'''


def click_in_row(p, text, cls):
    return p.evaluate("""([text, cls]) => { const r = [...document.querySelectorAll('#list tr')].find(r => r.innerText.includes(text));
      const b = r && r.querySelector('.' + cls); if (b) { b.click(); return true; } return false; }""", [text, cls])


def check5(pw, root):
    res = {}
    srv = serve(root); base = f'http://127.0.0.1:{srv.server_address[1]}'
    b = pw.chromium.launch(); errs = []

    def page():
        ctx = b.new_context(accept_downloads=True); p = ctx.new_page()
        p.on('pageerror', lambda e: errs.append(str(e)[:150])); p.on('dialog', lambda d: d.accept())
        p.goto(base + '/index.html#/transactions'); p.wait_for_timeout(600)
        return p

    def T(k, f):
        try: res[k] = bool(f())
        except Exception as e: res[k] = False; res[k + '_error'] = str(e)[:150]

    try:
        p = page()
        res.update(p.evaluate(BUG_MODS))

        def bug3():
            for d, n, a in (('2026-04-01', 'Alpha', -10), ('2026-04-02', 'Bravo', -20), ('2026-04-03', 'Charlie', -30)):
                add_tx(p, d, n, a, 'Misc')
            p.fill('#search', 'charlie'); p.wait_for_timeout(300)
            click_in_row(p, 'Charlie', 'delete'); p.wait_for_timeout(200)
            p.fill('#search', ''); p.wait_for_timeout(300); r = rows(p)
            ok1 = len(r) == 2 and any('Alpha' in x for x in r) and any('Bravo' in x for x in r)
            p.click('#sort-amount'); p.wait_for_timeout(300)
            click_in_row(p, 'Bravo', 'delete'); p.wait_for_timeout(200); r = rows(p)
            return ok1 and len(r) == 1 and 'Alpha' in r[0]
        T('bug3_delete_filtered', bug3)

        p = page()
        def bug5():
            add_tx(p, '2026-04-01', 'Paycheck', 1000, 'Income'); add_tx(p, '2026-04-03', 'Groceries', -250.5, 'Food')
            return p.evaluate("document.querySelector('#balance').innerText.trim()") .replace(',', '').endswith('749.50')
        T('bug5_balance_format', bug5)

        def bug6():
            p.goto(base + '/index.html#/budgets'); p.reload(); p.wait_for_timeout(600)
            a = visible(p, '#view-budgets') and not visible(p, '#view-transactions')
            p.goto(base + '/index.html#/reports'); p.reload(); p.wait_for_timeout(600)
            c = visible(p, '#view-reports') and not visible(p, '#view-transactions')
            return bool(a and c)
        T('bug6_reload_view', bug6)

        # Feature A: edit
        p = page()
        add_tx(p, '2026-04-01', 'Keep', -5, 'Misc'); add_tx(p, '2026-04-05', 'Delta', -40, 'Fun')
        def edit_inplace():
            n0 = len(rows(p)); click_in_row(p, 'Delta', 'edit'); p.wait_for_timeout(200)
            loaded = p.input_value('#description') == 'Delta' and p.input_value('#date') == '2026-04-05' and float(p.input_value('#amount')) == -40
            p.fill('#description', 'Delta2'); p.fill('#amount', '-45'); p.click('#add'); p.wait_for_timeout(300); r = rows(p)
            return loaded and len(r) == n0 and any('Delta2' in x and '45.00' in x for x in r) and not any(re.search(r'\bDelta\b(?!2)', x) for x in r)
        T('featA_edit', edit_inplace)

        def edit_undo():
            n0 = len(rows(p)); p.click('#undo'); p.wait_for_timeout(300); r = rows(p)
            return len(r) == n0 and any(re.search(r'\bDelta\b(?!2)', x) and '40.00' in x for x in r) and not any('Delta2' in x for x in r)
        T('featA_undo', edit_undo)

        def edit_cancel():
            n0 = len(rows(p)); click_in_row(p, 'Keep', 'edit'); p.wait_for_timeout(200); p.click('#cancel-edit'); p.wait_for_timeout(200)
            add_tx(p, '2026-04-06', 'Echo', -7, 'Misc'); r = rows(p)
            return len(r) == n0 + 1 and any('Echo' in x for x in r) and any('Keep' in x and '5.00' in x for x in r)
        T('featA_cancel', edit_cancel)

        # Feature B: rename a category
        p = page()
        add_tx(p, '2026-04-01', 'Chips', -3, 'Snacks'); add_tx(p, '2026-04-02', 'Cookies', -4, 'Snacks'); add_tx(p, '2026-04-03', 'Bus', -2, 'Transport')
        p.click('#nav-budgets'); p.wait_for_timeout(200)
        p.fill('#budget-category', 'Snacks'); p.fill('#budget-limit', '50'); p.click('#budget-add'); p.wait_for_timeout(200)
        p.fill('#budget-month', '2026-04'); p.dispatch_event('#budget-month', 'change'); p.wait_for_timeout(200)
        def rename_tx():
            p.fill('#rename-from', 'Snacks'); p.fill('#rename-to', 'Treats'); p.click('#rename'); p.wait_for_timeout(300)
            p.click('#nav-transactions'); p.wait_for_timeout(200); r = rows(p)
            return sum('Treats' in x for x in r) == 2 and not any('Snacks' in x for x in r) and any('Transport' in x for x in r)
        T('featB_rename_tx', rename_tx)

        def rename_budget():
            p.click('#nav-budgets'); p.wait_for_timeout(200); t = table_rows(p, '#budgets')
            return any('Treats' in x['text'] for x in t) and not any('Snacks' in x['text'] for x in t)
        T('featB_rename_budget', rename_budget)

        def rename_undo():
            p.click('#nav-transactions'); p.wait_for_timeout(200); p.click('#undo'); p.wait_for_timeout(300); r = rows(p)
            return sum('Snacks' in x for x in r) == 2 and not any('Treats' in x for x in r)
        T('featB_undo', lambda: res.get('featB_rename_tx') and rename_undo())

        # Feature C: change vs previous month
        p = page()
        for d, n, a, c in (('2026-03-04', 'Market', -100, 'Food'), ('2026-03-09', 'Phone', -20, 'Bills'),
                           ('2026-04-03', 'Groceries', -250.5, 'Food'), ('2026-04-01', 'Paycheck', 1000, 'Income')):
            add_tx(p, d, n, a, c)
        p.click('#nav-reports'); p.wait_for_timeout(200)
        p.fill('#report-month', '2026-04'); p.dispatch_event('#report-month', 'change'); p.wait_for_timeout(300)
        rep = table_rows(p, '#report')
        def row(cat):
            return next((x['text'].replace('−', '-') for x in rep if re.search(r'\b' + cat + r'\b', x['text'])), '')
        T('featC_change', lambda: '-150.50' in row('Food') and '-250.50' in row('Food'))
        T('featC_sign', lambda: '+1000.00' in row('Income'))
        T('featC_prev_only', lambda: bool(re.search(r'(^|\s)0\.00(\s|$)', row('Bills'))) and '+20.00' in row('Bills'))
    finally:
        b.close(); srv.shutdown()
    res['errors5'] = errs[:3]
    return res


KEPT = ['csv_basic', 'summary_all', 'summary_range', 'recur_week', 'budget', 'history', 'history_limit',
        'views', 'search', 'sort', 'import', 'export', 'budgets', 'chart', 'persist']
BUGS = ['bug1_month_end', 'bug2_csv_linebreak', 'bug3_delete_filtered', 'bug4_refund', 'bug5_balance_format', 'bug6_reload_view']
FEATS = ['featA_edit', 'featA_undo', 'featA_cancel', 'featB_rename_tx', 'featB_rename_budget', 'featB_undo', 'featC_change', 'featC_sign', 'featC_prev_only']


def check(pw, root):
    res = check5(pw, root)
    for k in BUGS + FEATS: res.setdefault(k, False)
    reg = check_tier4(pw, root)
    res['bugs'] = sum(bool(res[k]) for k in BUGS)
    res['features'] = sum(bool(res[k]) for k in FEATS)
    res['regression'] = reg['points']
    res['regression_failed'] = [k for k, v in reg.items() if v is False]
    # The 15 tier-4 tests the planted-bug base app already passes: did the run keep them working?
    res['kept'] = sum(bool(reg.get(k)) for k in KEPT)
    res['points'] = res['bugs'] + res['features'] + res['regression']; res['max'] = len(BUGS) + len(FEATS) + 23
    return res


def main():
    out = {}
    with sync_playwright() as pw:
        for d in sorted(os.listdir(sys.argv[1])):
            base = os.path.join(sys.argv[1], d)
            root = os.path.join(base, 'work') if os.path.exists(os.path.join(base, 'work', 'index.html')) else base
            if not os.path.exists(os.path.join(root, 'index.html')):
                out[d] = {'points': 0, 'max': 38, 'missing': True}; continue
            try:
                out[d] = check(pw, os.path.abspath(root))
            except Exception as e:
                out[d] = {'points': 0, 'max': 38, 'crash': str(e)[:200]}
            r = out[d]
            print(d, r.get('points'), 'bugs', r.get('bugs'), 'feat', r.get('features'), 'reg', r.get('regression'), 'kept', r.get('kept'),
                  [k for k in BUGS + FEATS if r.get(k) is False], r.get('regression_failed'), file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
