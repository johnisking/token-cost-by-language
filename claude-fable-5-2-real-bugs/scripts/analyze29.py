"""ds29 analysis (pre-registered, amendment 1): Fable 5.2 vs Fable 5.1 vs Opus 5.5 on the 25 bugs of dataset 25.
Primary analysis: design cells only (f52 rep 1-2, f51 rep 1, opus rep 1-2). Extra cells (f52 rep 3, f51 rep 2) reported separately."""
import json, os, random, statistics as st, collections
R = '/home/claude/ds29/pack/runs'
REF = {'q624': 2, 'q629': 1}
HARD = {'z6495', 'mit', 'mdit1201', 'ct435', 'mk4059', 'pm1643', 'z6496', 'pp653', 'jy791', 'mk4051'}
rows = []
for l in open('/home/claude/ds29/score/scores_all.jsonl'):
    l = l.strip()
    if not l.startswith('{'): continue
    r = json.loads(l)
    hard = r['bug'] in HARD
    if hard:
        broke = r.get('broke') or 0
    else:
        broke = None if r.get('suite_failures') is None else max(0, r['suite_failures'] - REF.get(r['bug'], 0))
    res = None
    for x in open(f"{R}/{r['run']}/run.jsonl", encoding='utf-8', errors='replace'):
        if '"type":"result"' in x:
            try: res = json.loads(x)
            except Exception: pass
    u = list((res or {}).get('modelUsage', {}).values())
    r.update(round='hard' if hard else 'easy', broke=broke, full=r['hidden_passed'] == r['hidden_total'],
             cost=(res or {}).get('total_cost_usd'), turns=(res or {}).get('num_turns'),
             out_tok=sum(v.get('outputTokens', 0) for v in u), think_tok=sum(v.get('thinkingTokens', 0) or 0 for v in u),
             cache_read=sum(v.get('cacheReadInputTokens', 0) for v in u),
             seconds=int(open(f"{R}/{r['run']}/seconds.txt").read().strip()))
    r['clean'] = bool(r['full'] and not r['broke'])
    r['design'] = not ((r['tool'] == 'f52' and r['rep'] == 3) or (r['tool'] == 'f51' and r['rep'] == 2))
    rows.append(r)
json.dump(rows, open('/home/claude/ds29/score/final29.json', 'w'), ensure_ascii=False, indent=0)
D = [r for r in rows if r['design']]
bugs = sorted({r['bug'] for r in D})
M = ['f52', 'f51', 'opus']
print('runs', len(rows), 'design', len(D), 'per arm', {m: sum(r['tool'] == m for r in D) for m in M}, 'suite None', sum(r['broke'] is None for r in rows))

def bugmean(rs, m, key):
    return {b: st.mean(key(r) for r in rs if r['tool'] == m and r['bug'] == b) for b in bugs}

def arm(m, key, rs=D):
    bm = bugmean(rs, m, key); return st.mean(bm.values())

for m in M:
    rs = [r for r in D if r['tool'] == m]
    print(f"{m:5} n={len(rs)} clean={sum(r['clean'] for r in rs)} full={sum(r['full'] for r in rs)} clean_rate_bugavg={arm(m, lambda r: r['clean']):.3f} "
          f"cost_bugavg=${arm(m, lambda r: r['cost']):.3f} cost_mean=${st.mean(r['cost'] for r in rs):.3f} out={st.mean(r['out_tok'] for r in rs):.0f} "
          f"think={st.mean(r['think_tok'] for r in rs):.0f} cache_read={st.mean(r['cache_read'] for r in rs):.0f} turns={st.mean(r['turns'] for r in rs):.1f} sec_med={st.median(r['seconds'] for r in rs)}")
    for rnd in ('easy', 'hard'):
        x = [r for r in rs if r['round'] == rnd]
        print(f"      {rnd}: clean {sum(r['clean'] for r in x)}/{len(x)} broke_runs {sum(1 for r in x if r['broke'])} cost ${st.mean(r['cost'] for r in x):.3f}")

def boot(fn, n=10000, seed=52):
    rnd = random.Random(seed); out = []
    for _ in range(n):
        s = [rnd.choice(bugs) for _ in bugs]; out.append(fn(s))
    out.sort(); return out[int(0.025 * n)], out[int(0.975 * n) - 1]

def cost_change(sample, a='f52', b='f51'):
    ca = bugmean(D, a, lambda r: r['cost']); cb = bugmean(D, b, lambda r: r['cost'])
    return st.mean(ca[x] for x in sample) / st.mean(cb[x] for x in sample) - 1

def clean_diff(sample, a='f52', b='opus'):
    ca = bugmean(D, a, lambda r: r['clean']); cb = bugmean(D, b, lambda r: r['clean'])
    return st.mean(ca[x] for x in sample) - st.mean(cb[x] for x in sample)

pc = cost_change(bugs); lo, hi = boot(cost_change)
print(f"PRIMARY 1 cost f52 vs f51: {pc*100:+.1f}% (95% CI {lo*100:+.1f} to {hi*100:+.1f}); list price -20%")
pd = clean_diff(bugs); lo, hi = boot(clean_diff)
print(f"PRIMARY 2 clean f52 - opus: {pd*100:+.1f} pts (95% CI {lo*100:+.1f} to {hi*100:+.1f}); threshold 15")
c2 = cost_change(bugs, 'f52', 'opus'); lo, hi = boot(lambda s: cost_change(s, 'f52', 'opus'))
print(f"secondary cost f52 vs opus: {c2*100:+.1f}% ({lo*100:+.1f} to {hi*100:+.1f})")
d2 = clean_diff(bugs, 'f52', 'f51'); lo, hi = boot(lambda s: clean_diff(s, 'f52', 'f51'))
print(f"secondary clean f52 - f51: {d2*100:+.1f} pts ({lo*100:+.1f} to {hi*100:+.1f})")
for m in M:
    rs = [r for r in D if r['tool'] == m]; cl = sum(r['clean'] for r in rs)
    print(f"cost per clean fix {m}: ${sum(r['cost'] for r in rs)/cl:.3f}" if cl else f"{m}: no clean fix")
print('per bug clean (f52 x2 / f51 x1 / opus x2):')
for b in bugs:
    print(' ', b, ' '.join(f"{m}:{sum(r['clean'] for r in D if r['tool']==m and r['bug']==b)}/{sum(1 for r in D if r['tool']==m and r['bug']==b)}" for m in M))
X = [r for r in rows if not r['design']]
print('extra cells', len(X), 'clean', sum(r['clean'] for r in X), 'cost mean', round(st.mean(r['cost'] for r in X), 3) if X else '-')
