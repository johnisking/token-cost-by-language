"""Tier 5B checker (2026-10-23): spreadsheet engine and page.

32 module tests (js/engine.js imported in the page, each on a fresh sheet) and 6 page tests, one point each.
usage: python3 check_tier5b.py <runs_dir> > tier5b.json   (each run folder holds the app, or work/ holds it)
"""
import json, os, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_tier3 import serve

MOD = r'''async () => {
  const out = {};
  let E; try { E = await import('/js/engine.js'); } catch (e) { out.import_error = String(e).slice(0, 150); return out; }
  const S = () => E.createSheet();
  const t = (k, f) => { try { out[k] = !!f(); } catch (e) { out[k] = false; out[k + '_error'] = String(e).slice(0, 120); } };
  const F = (f, pre = {}) => { const s = S(); for (const [k, v] of Object.entries(pre)) s.set(k, v); s.set('J30', f); return s.get('J30'); };
  const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
  t('basic_types', () => { const s = S(); s.set('A1', ' 4 '); s.set('A2', 'hello'); s.set('A3', '-3.5'); s.set('A4', '');
    return s.get('A1') === 4 && s.get('A2') === 'hello' && s.get('A3') === -3.5 && s.get('A4') === '' && s.raw('A1') === ' 4 ' && s.get('B9') === ''; });
  t('arith', () => near(F('=1+2*3-4/2'), 5) && near(F('=(1+2)*3'), 9));
  t('left_assoc', () => near(F('=10-4-3'), 3) && near(F('=100/10/5'), 2));
  t('pow_right_assoc', () => near(F('=2^3^2'), 512));
  t('unary_vs_pow', () => near(F('=-2^2'), -4) && near(F('=2*3^2'), 18) && near(F('=--3'), 3));
  t('refs_case', () => near(F('=a1*B1', {A1: '6', B1: '7'}), 42));
  t('empty_is_zero', () => near(F('=A1+5'), 5) && F('="x"&A1') === 'x');
  t('display_numbers', () => { const s = S(); s.set('A1', '=0.1+0.2'); s.set('A2', '5'); s.set('A3', '=1/3'); s.set('A4', '=2.50*1');
    return s.display('A1') === '0.3' && s.display('A2') === '5' && s.display('A3') === '0.3333333333' && s.display('A4') === '2.5'; });
  t('strings_concat', () => F('="A"&1.50') === 'A1.5' && F('="say ""hi"""') === 'say "hi"' && F('="a"&TRUE') === 'aTRUE');
  t('bool_arith', () => near(F('=TRUE+TRUE+FALSE'), 2));
  t('compare_eq', () => F('=1=1') === true && F('="abc"="ABC"') === true && F('=1="1"') === false && F('=2<>3') === true);
  t('compare_order', () => F('=3>=3') === true && F('="a"<"B"') === true && F('=1<"a"') === '#VALUE!');
  t('compare_lowest', () => F('=1+1=2') === true && F('="a"&"b"="AB"') === true);
  t('text_arith_error', () => F('=1+"x"') === '#VALUE!' && F('=A1*2', {A1: 'abc'}) === '#VALUE!');
  t('div_zero', () => F('=1/0') === '#DIV/0!' && F('=5/A1') === '#DIV/0!');
  t('ref_out_of_grid', () => F('=K1') === '#REF!' && F('=A31+1') === '#REF!');
  t('name_error', () => F('=FOO(1)') === '#NAME?' && F('=sum(1,2)') === 3);
  t('parse_error', () => F('=1+') === '#ERROR!' && F('=(1') === '#ERROR!');
  t('error_propagation', () => F('=A1+1', {A1: '=1/0'}) === '#DIV/0!' && F('=SUM(A1:A3)', {A1: '1', A2: '=K9', A3: '2'}) === '#REF!');
  t('sum_range_skip', () => { const pre = {A1: '1', A2: 'x', A3: '3', B1: '4'}; return near(F('=SUM(A1:B3)', pre), 8) && near(F('=SUM(B3:A1)', pre), 8) && near(F('=SUM(A1:A3,10)', pre), 14); });
  t('count_avg', () => { const pre = {A1: '1', A2: 'x', A3: '3'}; return F('=COUNT(A1:A3)', pre) === 2 && near(F('=AVERAGE(A1:A3)', pre), 2) && F('=AVERAGE(C1:C3)') === '#DIV/0!'; });
  t('min_max', () => { const pre = {A1: '5', A2: '-2', A3: '9'}; return near(F('=MIN(A1:A3)', pre), -2) && near(F('=MAX(A1:A3,20)', pre), 20) && near(F('=MAX(C1:C3)'), 0); });
  t('if_lazy', () => near(F('=IF(1,5,1/0)'), 5) && F('=IF(0,5)') === false && F('=IF(2>1,"yes","no")') === 'yes');
  t('round_abs', () => near(F('=ROUND(2.5,0)'), 3) && near(F('=ROUND(-2.5,0)'), -3) && near(F('=ROUND(1234,-2)'), 1200) && near(F('=ROUND(3.14159,2)'), 3.14) && near(F('=ABS(-3)'), 3));
  t('recalc_chain', () => { const s = S(); s.set('A1', '2'); s.set('B1', '=A1*10'); s.set('C1', '=B1+1'); const a = near(s.get('C1'), 21);
    s.set('A1', '3'); return a && near(s.get('C1'), 31) && near(s.get('B1'), 30); });
  t('cycle', () => { const s = S(); s.set('A1', '=B1+1'); s.set('B1', '=C1+1'); s.set('C1', '=A1+1'); s.set('D1', '=A1*2'); s.set('E1', '=5');
    return ['A1', 'B1', 'C1', 'D1'].every(k => s.get(k) === '#CYCLE!') && near(s.get('E1'), 5); });
  t('cycle_recover', () => { const s = S(); s.set('A1', '=B1+1'); s.set('B1', '=A1+1'); s.set('C1', '=B1'); s.get('A1'); s.set('B1', '7');
    return near(s.get('A1'), 8) && near(s.get('C1'), 7); });
  t('copy_relative', () => { const s = S(); s.set('A1', '1'); s.set('A2', '2'); s.set('B1', '=A1*10'); s.copy('B1', 'B2'); return near(s.get('B2'), 20) && /^=\s*A2\s*\*\s*10$/i.test(s.raw('B2')); });
  t('copy_absolute', () => { const s = S(); for (const [k, v] of Object.entries({A1: '1', A3: '3', B1: '4', B3: '6', C3: '7'})) s.set(k, v);
    s.set('D1', '=A1+$A$1+$A1+A$1'); s.copy('D1', 'E3'); return near(s.get('E3'), 6 + 1 + 3 + 4); });
  t('copy_out_of_grid', () => { const s = S(); s.set('B2', '=A1+1'); s.copy('B2', 'A1'); return s.display('A1') === '#REF!'; });
  t('undo_redo', () => { const s = S(); s.set('A1', '1'); s.set('A1', '2'); s.set('B1', '=A1'); s.copy('B1', 'B2');
    s.undo(); const a = s.raw('B2') === ''; s.undo(); const b = s.raw('B1') === '' && s.raw('A1') === '2'; s.undo(); const c = s.raw('A1') === '1';
    s.redo(); const d = s.raw('A1') === '2'; s.set('C1', 'x'); s.redo(); const e = s.raw('B1') === '';
    return a && b && c && d && e; });
  t('to_csv', () => { const s = S(); s.set('A1', 'a,b'); s.set('B2', '=1/4'); s.set('C1', 'say "x"');
    return s.toCSV().replace(/\r\n/g, '\n').replace(/\n$/, '') === '"a,b",,"say ""x"""\n,0.25,'; });
  return out;
}'''

MODS = ['basic_types', 'arith', 'left_assoc', 'pow_right_assoc', 'unary_vs_pow', 'refs_case', 'empty_is_zero', 'display_numbers', 'strings_concat',
        'bool_arith', 'compare_eq', 'compare_order', 'compare_lowest', 'text_arith_error', 'div_zero', 'ref_out_of_grid', 'name_error', 'parse_error',
        'error_propagation', 'sum_range_skip', 'count_avg', 'min_max', 'if_lazy', 'round_abs', 'recalc_chain', 'cycle', 'cycle_recover',
        'copy_relative', 'copy_absolute', 'copy_out_of_grid', 'undo_redo', 'to_csv']
UI = ['ui_grid', 'ui_enter', 'ui_formula_bar', 'ui_copy_paste', 'ui_undo', 'ui_persist_export']


def cell(p, ref):
    return p.evaluate(f"(document.querySelector('#grid td[data-ref=\"{ref}\"]')?.innerText || '').trim()")


def enter(p, ref, text):
    p.click(f'#grid td[data-ref="{ref}"]'); p.fill('#formula', text); p.press('#formula', 'Enter'); p.wait_for_timeout(150)


def check(pw, root):
    res = {}
    srv = serve(root); base = f'http://127.0.0.1:{srv.server_address[1]}'
    b = pw.chromium.launch(); ctx = b.new_context(accept_downloads=True); p = ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:150])); p.on('dialog', lambda d: d.accept())
    def T(k, f):
        try: res[k] = bool(f())
        except Exception as e: res[k] = False; res[k + '_error'] = str(e)[:150]
    try:
        p.goto(base + '/index.html'); p.wait_for_timeout(700)
        res.update(p.evaluate(MOD))
        p.evaluate('localStorage.clear()'); p.reload(); p.wait_for_timeout(700)
        T('ui_grid', lambda: p.evaluate("document.querySelectorAll('#grid td[data-ref]').length") == 300
          and p.query_selector('#grid td[data-ref="A1"]') is not None and p.query_selector('#grid td[data-ref="J30"]') is not None)

        def ui_enter():
            enter(p, 'A1', '5'); enter(p, 'B1', '=A1*2')
            sel_moved = p.input_value('#formula') == ''  # B2 is empty and now selected
            enter(p, 'A1', '7')
            return cell(p, 'A1') == '7' and cell(p, 'B1') == '14' and sel_moved
        T('ui_enter', ui_enter)

        def ui_formula_bar():
            p.click('#grid td[data-ref="B1"]'); p.wait_for_timeout(100)
            return p.input_value('#formula').replace(' ', '').upper() == '=A1*2'
        T('ui_formula_bar', ui_formula_bar)

        def ui_copy_paste():
            enter(p, 'A2', '3')
            p.click('#grid td[data-ref="B1"]'); p.click('#copy'); p.click('#grid td[data-ref="B2"]'); p.click('#paste'); p.wait_for_timeout(150)
            return cell(p, 'B2') == '6'
        T('ui_copy_paste', ui_copy_paste)

        def ui_undo():
            p.click('#undo'); p.wait_for_timeout(150); a = cell(p, 'B2') == ''
            p.click('#redo'); p.wait_for_timeout(150); return a and cell(p, 'B2') == '6'
        T('ui_undo', ui_undo)

        def ui_persist_export():
            p.reload(); p.wait_for_timeout(700)
            kept = cell(p, 'B1') == '14' and cell(p, 'B2') == '6'
            with p.expect_download(timeout=3000) as dl:
                p.click('#export')
            txt = open(dl.value.path(), encoding='utf-8').read().replace('\r\n', '\n')
            return kept and txt.split('\n')[0].lstrip('﻿') == '7,14' and txt.split('\n')[1] == '3,6'
        T('ui_persist_export', ui_persist_export)
    finally:
        b.close(); srv.shutdown()
    for k in MODS + UI: res.setdefault(k, False)
    res['errors'] = errs[:3]
    res['module'] = sum(bool(res[k]) for k in MODS); res['page'] = sum(bool(res[k]) for k in UI)
    res['points'] = res['module'] + res['page']; res['max'] = len(MODS) + len(UI)
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
            print(d, r.get('points'), 'module', r.get('module'), 'page', r.get('page'), [k for k in MODS + UI if r.get(k) is False], file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
