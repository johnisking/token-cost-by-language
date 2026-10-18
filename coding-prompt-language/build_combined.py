"""Rebuild combined.json for the prompt-language coding dataset.

Runs 1-2 come from the first measurement (2026-10-18; English runs 1-2 are the
Claude Code vs Codex dataset runs). Runs 3-5 were added on 2026-10-19 with the
same script, versions and settings. Every row is recomputed from the raw logs.

usage: python3 build_combined.py            (writes combined.json)
       python3 build_combined.py --check    (only compares with the current combined.json)
"""
import json, os, re, sys, glob
from parse import claude, codex, ui_lang

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
LANGS = ['en', 'ko', 'ja', 'es', 'uk']


def run_dir(tool, lang, run):
    name = f'{"claude" if tool == "claude_code" else "codex"}_{lang}_r{run}'
    for p in (os.path.join(RAW, name), os.path.join(RAW, 'en', name)):
        if os.path.isdir(p):
            return p


def claude_turns(p):
    for l in open(p, encoding='utf-8', errors='replace'):
        try:
            j = json.loads(l)
        except Exception:
            continue
        if 'num_turns' in j:
            return j['num_turns']


def non_ascii_in_script(html):
    code = ''.join(re.findall(r'<script[^>]*>(.*?)</script>', html, re.S))
    return sum(1 for ch in code if ord(ch) > 0x24F and ch.isalpha())  # non-Latin letters (Hangul, kana, kanji, Cyrillic)


def text_lang(s):
    n = dict(ko=len(re.findall(r'[가-힣]', s)), ja=len(re.findall(r'[぀-ヿ]', s)), uk=len(re.findall(r'[Ѐ-ӿ]', s)))
    b = max(n, key=n.get)
    if n[b] >= 5:
        return b
    es = len(re.findall(r'\b(el|la|los|las|de|del|que|con|para|un|una|juego|archivo|niveles|vidas)\b', s, re.I))
    en = len(re.findall(r'\b(the|and|with|for|a|game|file|levels|lives|is|it)\b', s, re.I))
    return 'es' if es > en else 'en'


def row(tool, lang, run, works_map):
    d = run_dir(tool, lang, run)
    if not d:
        return None
    log = os.path.join(d, 'run.json' if tool == 'claude_code' else 'run.jsonl')
    u = claude(log) if tool == 'claude_code' else codex(log)
    if not u or not u.get('input_tokens'):
        return None
    html_p = os.path.join(d, 'work', 'index.html')
    html = open(html_p, encoding='utf-8', errors='replace').read() if os.path.exists(html_p) else ''
    sec_p = os.path.join(d, 'seconds.txt')
    w = works_map.get(os.path.relpath(html_p, RAW).replace(os.sep, '/'))
    return dict(tool=tool, prompt_language=lang, run=run,
                seconds=int(open(sec_p).read().strip()) if os.path.exists(sec_p) else None,
                file_chars=len(html), file_lines=html.count('\n') + 1 if html else 0,
                ui_language=ui_lang(html) if html else None,
                input_tokens=u['input_tokens'], cached_input_tokens=u['cached_input_tokens'], output_tokens=u['output_tokens'],
                api_cost_usd=u['api_cost_usd'],
                works=None if w is None else w['works'], page_errors=None if w is None else w['errors'],
                non_ascii_letters_in_script=non_ascii_in_script(html),
                agent_turns=claude_turns(log) if tool == 'claude_code' else None,
                reply_language=text_lang(u['reply']))


def main():
    old = json.load(open(os.path.join(HERE, 'combined.json'), encoding='utf-8'))
    wp = os.path.join(HERE, 'works.json')
    works_map = json.load(open(wp)) if os.path.exists(wp) else {}
    rows = []
    for lang in LANGS:
        for tool in ['claude_code', 'codex']:
            for run in range(1, 6):
                r = row(tool, lang, run, works_map)
                if r:
                    rows.append(r)
    # Runs 1-2 of English have no seconds.txt here; keep the times recorded in the Claude Code vs Codex dataset.
    prev = {(r['tool'], r['prompt_language'], r['run']): r for r in old['rows']}
    for r in rows:
        p = prev.get((r['tool'], r['prompt_language'], r['run']))
        if p and r['seconds'] is None:
            r['seconds'] = p['seconds']
        if p and r['works'] is None:
            r['works'], r['page_errors'] = p['works'], p['page_errors']
    if '--check' in sys.argv:
        bad = 0
        for r in rows:
            p = prev.get((r['tool'], r['prompt_language'], r['run']))
            if not p:
                continue
            for k, v in p.items():
                if r.get(k) != v:
                    bad += 1
                    print('DIFF', r['tool'], r['prompt_language'], r['run'], k, 'old', v, 'new', r.get(k))
        print('checked', len(prev), 'rows,', bad, 'differences')
        return
    old['rows'] = rows
    old['measured'] = '2026-10-18 (runs 1-2) and 2026-10-19 (runs 3-5)'
    old['note'] = ('English runs 1-2 are the same-task runs of the Claude Code vs Codex dataset (measured 2026-10-18, same settings). '
                   'Runs 3-5 for all five languages were added on 2026-10-19 with the same tool versions and settings.')
    json.dump(old, open(os.path.join(HERE, 'combined.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('wrote', len(rows), 'rows')


if __name__ == '__main__':
    main()
