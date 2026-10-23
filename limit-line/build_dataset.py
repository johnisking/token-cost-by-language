"""Build the limit-line dataset (2026-10-23/24): one row per run, tiers 2 to 6.

usage: python3 build_dataset.py <scratch_limit_dir> <out_dir>
Scores come from the checkers (results/*.json and the rescored tier 2/3 files), time and tokens from each run's log.
"""
import json, os, re, sys, csv

HERE = os.path.dirname(os.path.abspath(__file__))
S, OUT = sys.argv[1], sys.argv[2]
RES = os.path.join(HERE, 'results')

MODEL = {'haiku': 'claude-haiku-5-5', 'sonnet': 'claude-sonnet-5-5', 'opus': 'claude-opus-5-5',
         'codex': 'gpt-6-luna', 'gemini': 'gemini-4-argon', 'geminifull': 'gemini-4-argon'}
HARNESS = {'haiku': 'Claude Code 2.1.295', 'sonnet': 'Claude Code 2.1.295', 'opus': 'Claude Code 2.1.295',
           'codex': 'Codex CLI 0.162', 'gemini': 'Antigravity CLI 1.4.5', 'geminifull': 'Antigravity CLI 1.4.5'}
TASK = {'2': 'Five-level brick game with pause, level skip and saved progress (single file)',
        '3': 'Multi-file expense tracker (CSV module, summary module, UI)',
        '4': 'Budget app: 5 modules, 3 hash-routed views, undo/redo, budgets, reports',
        '5a': 'Fix 6 reported bugs and add 3 features in an existing 1,032-line budget app',
        '5b': 'Spreadsheet engine and page (formulas, precedence, cycles, relative/absolute copy, undo)',
        '6t1': 'marked: drop leading whitespace after a hard line break (real bug, fixed upstream in 123ce04b)',
        '6t2': 'marked: no nested link for a bare URL after an image inside a link (upstream cc07bb9c)',
        '6t3': 'marked: a code span ending in a backslash must not hide later emphasis (upstream 6a57018f)'}


def tokens(run_dir, tool):
    """(input_tokens incl. cache, cache_read_tokens, output_tokens, api_cost_usd) from the run log."""
    jl = os.path.join(run_dir, 'run.jsonl'); js = os.path.join(run_dir, 'run.json')
    if tool in ('haiku', 'sonnet', 'opus') and os.path.exists(jl):
        res = None
        for line in open(jl, encoding='utf-8', errors='replace'):
            if '"type":"result"' in line:
                try: res = json.loads(line)
                except Exception: pass
        if res:
            u = res.get('usage', {})
            inp = u.get('input_tokens', 0) + u.get('cache_creation_input_tokens', 0) + u.get('cache_read_input_tokens', 0)
            return inp, u.get('cache_read_input_tokens', 0), u.get('output_tokens', 0), round(res.get('total_cost_usd', 0), 4)
    if tool == 'codex' and os.path.exists(jl):
        i = c = o = 0; seen = False
        for line in open(jl, encoding='utf-8', errors='replace'):
            if '"turn.completed"' in line:
                try: u = json.loads(line)['usage']
                except Exception: continue
                i += u.get('input_tokens', 0); c += u.get('cached_input_tokens', 0); o += u.get('output_tokens', 0); seen = True
        if seen: return i, c, o, None
    if tool.startswith('gemini') and os.path.exists(js):
        t = open(js, encoding='utf-8', errors='replace').read(); k = t.find('{"conversation_id"')
        if k >= 0:
            try:
                u = json.loads(t[k:].strip().splitlines()[0]).get('usage', {})
                cr = u.get('cache_read_tokens', 0)
                return u.get('input_tokens', 0) + cr, cr, u.get('output_tokens', 0), None
            except Exception: pass
    return None, None, None, None


SECONDS_FALLBACK = {'gemini_t4_r4': 197}  # re-run whose seconds.txt was not copied back; value from the runner's console line


def seconds(run_dir):
    if os.path.basename(run_dir) in SECONDS_FALLBACK and not os.path.exists(os.path.join(run_dir, 'seconds.txt')):
        return SECONDS_FALLBACK[os.path.basename(run_dir)]
    p = os.path.join(run_dir, 'seconds.txt')
    try: return int(open(p).read().strip())
    except Exception: return None


rows = []
def add(tier, task_key, name, run_dir, score, mx, extra=None, note='', excluded=False, date='2026-10-23', tool=None):
    m = re.match(r'([a-z]+)_t(\w+?)_r(\d+)', name)
    tool = tool or m.group(1); run = int(m.group(3))
    i, c, o, cost = tokens(run_dir, tool) if run_dir and os.path.isdir(run_dir) else (None,) * 4
    r = {'tier': tier, 'task': task_key, 'task_description': TASK[task_key], 'tool': 'gemini' if tool == 'geminifull' else tool,
         'model': MODEL[tool], 'harness': HARNESS[tool],
         'permissions': 'full (--dangerously-skip-permissions)' if tool == 'geminifull' else ('allow-rules' if tool == 'gemini' else 'default'),
         'run': run, 'measured': date, 'score': score, 'max_score': mx, 'full_marks': (score == mx) if score is not None else None,
         'seconds': seconds(run_dir) if run_dir else None, 'input_tokens': i, 'cache_read_tokens': c, 'output_tokens': o,
         'api_cost_usd': cost, 'excluded': excluded, 'note': note}
    r.update(extra or {})
    rows.append(r)


def j(p): return json.load(open(p))

# tier 2 (rescored; pause check flaky for one run, see note)
t2 = j(os.path.join(S, 'final', 't2.2.json'))
for k, v in sorted(t2.items()):
    note = ''
    if k == 'haiku_t2_r5':
        note = ('pause check passed in 2 of 5 scorings; the failures came from the ball being re-served after a lost life '
                'just before resuming (no movement to see). Pause code read and works; counted as passed.')
    add('2', '2', k, os.path.join(S, 'final', 't2', k), 9 if k == 'haiku_t2_r5' else v['points'], v['max'], note=note)

# tier 3 (rescored)
t3 = j(os.path.join(S, 'final', 't3.json'))
for k, v in sorted(t3.items()):
    note = 'app.js contains literal "\\n" sequences: a syntax error (node --check)' if v['points'] < v['max'] else ''
    add('3', '3', k, os.path.join(S, 'final', 't3', k), v['points'], v['max'], note=note)

# tier 4
t4 = j(os.path.join(RES, 'tier4.json'))
add('4', '4', 'gemini_t4_r4', os.path.join(S, 'z4b', 'gemini_t4_r4'), 0, 23, excluded=True,
    note='First attempt: ended after 12 s when its first command (Get-ChildItem -Force) was auto-denied in headless mode; re-run below.')
for k, v in sorted(t4.items()):
    d = os.path.join(S, 't4r4', k) if k == 'gemini_t4_r4' else os.path.join(S, 't4b', k)
    add('4', '4', k, d, v['points'], v.get('max', 23), note=v.get('note', ''))

# tier 5A
t5a = j(os.path.join(RES, 'tier5a.json'))
for k, v in sorted(t5a.items()):
    ex = k == 'gemini_t5a_r1'
    add('5', '5a', k, os.path.join(S, 't5a_c', k), v['points'], v.get('max', 38), excluded=ex, note=v.get('note', ''),
        extra={'bugs_fixed_of_6': v.get('bugs'), 'feature_checks_of_9': v.get('features'), 'old_tests_kept_of_15': v.get('kept')})

# tier 5B
t5b = j(os.path.join(RES, 'tier5b.json'))
for k, v in sorted(t5b.items()):
    add('5', '5b', k, os.path.join(S, 't5b_c', k), v['points'], v.get('max', 38),
        extra={'module_tests_of_32': v.get('module'), 'page_tests_of_6': v.get('page')})

# tier 6
t6 = j(os.path.join(RES, 'tier6.json'))
T6LOG = os.path.join(S, 't6_g_all')
for k in ('gemini_t6t1_r1', 'gemini_t6t2_r1', 'gemini_t6t3_r1'):
    task = k.split('_')[1][1:]
    add('6', task, k, os.path.join(T6LOG, k + '_failed_denied'), 0, 1, excluded=True,
        note='First attempt: ended on a denied command (node -v or git log) before any edit; re-run below.')
DATE_24 = {'geminifull_t6t2_r2', 'geminifull_t6t3_r2'}
for k, v in sorted(t6.items()):
    task = k.split('_')[1][1:]
    hc = v.get('cases', '')
    m = re.match(r'(\d+)/(\d+)', hc or '')
    add('6', task, k, os.path.join(T6LOG, k), v['points'], 1, excluded=bool(v.get('excluded')), note=v.get('note', ''),
        date='2026-10-24' if k in DATE_24 else '2026-10-23',
        extra={'solved': v.get('solved'), 'new_test_failures': len(v.get('regressions', [])),
               'hidden_cases_passed': int(m.group(1)) if m else None, 'hidden_cases': int(m.group(2)) if m else None,
               'lines_added': v.get('diff', {}).get('added'), 'lines_removed': v.get('diff', {}).get('removed')})

os.makedirs(OUT, exist_ok=True)
cols = []
for r in rows:
    for c in r:
        if c not in cols: cols.append(c)
with open(os.path.join(OUT, 'ai-coding-limit-line.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
    for r in rows: w.writerow({c: ('' if r.get(c) is None else r.get(c)) for c in cols})
meta = {'title': 'Where AI coding agents first fail: six levels of tasks, five tools',
        'measured': '2026-10-23 to 2026-10-24', 'license': 'CC BY 4.0', 'tasks': TASK,
        'scoring': {'2': '9 black-box checks', '3': '12 checks', '4': '23 checks (10 module, 13 UI)',
                    '5a': '38 = 6 bug checks + 9 feature checks + 23 tier-4 regression checks',
                    '5b': '38 = 32 engine module tests + 6 page tests',
                    '6': '1 point if the upstream fix\'s hidden spec passes and no other marked spec test newly fails'},
        'runs': rows}
json.dump(meta, open(os.path.join(OUT, 'ai-coding-limit-line.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(rows), 'rows;', sum(not r['excluded'] for r in rows), 'counted')
