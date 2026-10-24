"""Combine easy (final.json) and hard (scores_hard.jsonl) rounds: per bug x model, totals, cost, tests."""
import json, os, random, statistics as st, itertools
from math import comb
M = ['haiku', 'sonnet', 'opus']
easy = json.load(open('/home/claude/b15/final.json'))
hard = [json.loads(l) for l in open('/home/claude/b15/hard/scores_hard.jsonl') if l.strip()]
for r in hard:
    d = f"/home/claude/b15/hard/results/{r['run']}"
    res = None
    for l in open(d + '/run.jsonl', encoding='utf-8', errors='replace'):
        if '"type":"result"' in l:
            try: res = json.loads(l)
            except Exception: pass
    r['cost'] = res.get('total_cost_usd') if res else None
    r['turns'] = res.get('num_turns') if res else None
    r['denials'] = len(res.get('permission_denials', [])) if res else None
    try: r['seconds'] = int(open(d + '/seconds.txt').read().strip())
    except Exception: r['seconds'] = None
    r['full'] = r['hidden_passed'] == r['hidden_total']
for r in easy: r['round'] = 'easy'
for r in hard: r['round'] = 'hard'
for r in easy + hard: r['clean'] = r['full'] and not r['broke']
json.dump(hard, open('/home/claude/b15/hard/final_hard.json', 'w'), ensure_ascii=False, indent=0)

def fisher(a, b, c, d):  # two-sided, table [[a,b],[c,d]]
    n = a + b + c + d; r1 = a + b; c1 = a + c
    p0 = comb(r1, a) * comb(n - r1, c1 - a) / comb(n, c1); p = 0
    for x in range(max(0, c1 - (n - r1)), min(r1, c1) + 1):
        px = comb(r1, x) * comb(n - r1, c1 - x) / comb(n, c1)
        if px <= p0 * (1 + 1e-9): p += px
    return min(1, p)

def perm_paired(rows, m1, m2, key, iters=20000, seed=1):
    """Bug-stratified permutation: swap model labels within each (bug, rep) pair."""
    pairs = []
    for b in sorted({r['bug'] for r in rows}):
        x = sorted([r for r in rows if r['bug'] == b and r['tool'] == m1], key=lambda r: r['rep'])
        y = sorted([r for r in rows if r['bug'] == b and r['tool'] == m2], key=lambda r: r['rep'])
        for a, c in zip(x, y): pairs.append((key(a), key(c)))
    obs = sum(a - c for a, c in pairs)
    rnd = random.Random(seed); ge = 0
    for _ in range(iters):
        s = sum((a - c) if rnd.random() < .5 else (c - a) for a, c in pairs)
        if abs(s) >= abs(obs) - 1e-12: ge += 1
    return obs / len(pairs), ge / iters, len(pairs)

for name, rows in (('EASY', easy), ('HARD', hard), ('ALL', easy + hard)):
    print(f'===== {name} runs={len(rows)}')
    if name != 'ALL':
        for b in sorted({r['bug'] for r in rows}):
            line = [f'{b:9}']
            for m in M:
                rs = sorted([r for r in rows if r['bug'] == b and r['tool'] == m], key=lambda r: r['rep'])
                line.append(f"{m[0]}:" + ','.join(f"{r['hidden_passed']}" + (f"!{r['broke']}" if r['broke'] else '') for r in rs) + f"/{rs[0]['hidden_total']}")
            print('  '.join(line))
    for m in M:
        rs = [r for r in rows if r['tool'] == m]
        cr = sum(r['hidden_passed'] for r in rs) / sum(r['hidden_total'] for r in rs)
        # per-bug-averaged case rate (each bug weighs the same)
        bugs = sorted({r['bug'] for r in rs})
        cb = st.mean(st.mean(r['hidden_passed'] / r['hidden_total'] for r in rs if r['bug'] == b) for b in bugs)
        print(f"{m:7} n={len(rs)} case={cr:.3f} case_bugavg={cb:.3f} full={sum(r['full'] for r in rs)} clean={sum(r['clean'] for r in rs)} "
              f"broke_runs={sum(1 for r in rs if r['broke'])} cost_mean=${st.mean(r['cost'] for r in rs if r['cost'] is not None):.3f} "
              f"cost_sum=${sum(r['cost'] or 0 for r in rs):.2f} sec_median={st.median(r['seconds'] for r in rs if r['seconds'])}")
    for m1, m2 in (('haiku', 'opus'), ('haiku', 'sonnet'), ('sonnet', 'opus')):
        f1 = [r for r in rows if r['tool'] == m1]; f2 = [r for r in rows if r['tool'] == m2]
        a = sum(r['full'] for r in f1); c = sum(r['full'] for r in f2)
        ca = sum(r['clean'] for r in f1); cc = sum(r['clean'] for r in f2)
        pf = fisher(a, len(f1) - a, c, len(f2) - c); pc = fisher(ca, len(f1) - ca, cc, len(f2) - cc)
        d, pp, n = perm_paired(rows, m1, m2, lambda r: r['hidden_passed'] / r['hidden_total'])
        d2, pp2, _ = perm_paired(rows, m1, m2, lambda r: int(r['clean']))
        print(f"  {m1} vs {m2}: Fisher full p={pf:.3f} clean p={pc:.3f} | paired perm case diff={d:+.3f} p={pp:.3f} clean diff={d2:+.3f} p={pp2:.3f} (pairs {n})")
