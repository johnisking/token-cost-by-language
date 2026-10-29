"""ds26 analysis: per-run R/U case counts, then per-condition U pass rate with bug-level bootstrap CI vs C0.
usage: python3 analyze26.py scores.jsonl [model]"""
import json, re, sys, random, collections
HERE = '/home/claude/b26'
L = json.load(open(f'{HERE}/labels.json'))
B26 = json.load(open(f'{HERE}/baseline26.json'))
B25 = json.load(open('/home/claude/b15/hard/baseline.json'))
NAMES = {'q629': ['issue example a=b,c', 'entities interpreted per element', 'entity comma and encoded comma stay inside elements', 'empty entries kept', 'repeated keys', '[] keys', '[0] key', 'charsetSentinel', 'arrayLimit overflow', 'throwOnLimitExceeded', 'falsy decoder results kept', 'old crash test now gives nested array'],
         't336': ["preserve '0'", "preserve '42'", "preserve '1_000'", "preserve '5_349_221'", "preserve '+1_000'", "preserve '-1_000'", "preserve '0xdead_beef'", "preserve '0xDEAD_BEEF'", "preserve '0o7_7'", "preserve '0b1_0'", "emit '1_000'", "emit '0xdead_beef'", "emit '+1_000'", "emit '0o7_7'", "reject ''", "reject 'abc'", "reject '_100'", "reject '100_'", "reject '1__000'", "reject '01_2'", "reject '0x_1'", "reject '0X1'", "reject '+0x1'", "reject '-0o7'", "reject ' 1'", "reject '1 '", "reject '1.0'", "reject '1e3'", 'int 1000 unchanged']}
GROUP = {**{b: 'K' for b in L['K']}, **{b: 'N' for b in ['ct443', 'ct446', 'ct440', 'z6641', 'z6659', 'pm1668', 'fy7073', 'pq256']},
         **{b: 'H' for b in ['ct437', 'any1273', 'du1369', 'un5981', 'any1364']}}


def klabel(tag, name):
    for pat, lab in L['K'][tag]:
        if re.search(pat, name):
            return lab
    return 'G'


def row(r):
    tag = r['tag']; out = dict(run=r['run'], tag=tag, group=GROUP[tag], model=r['model'], cond=r['cond'])
    R = U = Rp = Up = 0; Ut = Utp = 0
    if r.get('scorer') == 'ds26':
        lab = B26[tag]['labels']; tg = set(B26[tag]['target'])
        for k, ok in r['cases'].items():
            l = lab[k]
            if l == 'R': R += 1; Rp += ok
            elif l == 'U':
                U += 1; Up += ok
                if k in tg: Ut += 1; Utp += ok
        broke = r['broke']
    elif tag in NAMES:
        failed = set(r.get('hidden_failed') or [])
        if r.get('hidden_total') is None:  # cases script crashed: everything fails
            failed = set(NAMES[tag])
        for n in NAMES[tag]:
            l = klabel(tag, n); ok = n not in failed
            if l == 'R': R += 1; Rp += ok
            else: U += 1; Up += ok; Ut += 1; Utp += ok
        broke = r.get('suite_failures') or 0
    else:
        b = B25[tag]; failed = set(r.get('hidden_failed') or []); bn = set(r.get('broke_names') or [])
        out['trunc'] = r.get('broke', 0) > len(bn)
        for t in b['target']:
            l = klabel(tag, t); ok = t not in failed
            if l == 'R': R += 1; Rp += ok
            elif l == 'U': U += 1; Up += ok; Ut += 1; Utp += ok
        g_broken = 0
        for g in b['guard']:
            l = klabel(tag, g); ok = g not in bn
            if l == 'U': U += 1; Up += ok
            elif l == 'R': R += 1; Rp += ok
            elif not ok: g_broken += 1
        broke = g_broken
    out.update(R=R, Rp=Rp, U=U, Up=Up, Ut=Ut, Utp=Utp, broke=broke,
               clean=(Rp == R and Up == U and broke == 0))
    return out


def boot(per_bug_a, per_bug_b, n=10000, seed=1):
    bugs = sorted(set(per_bug_a) & set(per_bug_b)); rnd = random.Random(seed); ds = []
    for _ in range(n):
        s = [rnd.choice(bugs) for _ in bugs]
        ds.append(sum(per_bug_b[x] - per_bug_a[x] for x in s) / len(s))
    ds.sort(); return ds[int(0.025 * n)], ds[int(0.975 * n)]


if __name__ == '__main__':
    rows = [row(json.loads(l)) for l in open(sys.argv[1]) if l.strip()]
    if len(sys.argv) > 2:
        rows = [r for r in rows if r['model'] == sys.argv[2]]
    json.dump(rows, open(sys.argv[1].replace('.jsonl', '_rows.json'), 'w'), indent=0)
    print('truncated broke lists:', sum(1 for r in rows if r.get('trunc')))
    for grp in ['K', 'N', 'H', 'all']:
        sel = [r for r in rows if grp == 'all' or r['group'] == grp]
        per = collections.defaultdict(lambda: collections.defaultdict(list))
        for r in sel:
            if r['U']:
                per[r['cond']][r['tag']].append(r['Up'] / r['U'])
        bugm = {c: {t: sum(v) / len(v) for t, v in d.items()} for c, d in per.items()}
        line = [f'{grp:>3} bugs={len(bugm.get("C0", {}))}']
        for c in ['C0', 'C1', 'C2', 'C3']:
            if c not in bugm: continue
            m = sum(bugm[c].values()) / len(bugm[c])
            cl = [r for r in sel if r['cond'] == c]
            s = f'{c} U={m*100:.0f}% clean={sum(r["clean"] for r in cl)}/{len(cl)} broke_runs={sum(r["broke"]>0 for r in cl)}'
            if c != 'C0':
                lo, hi = boot(bugm['C0'], bugm[c]); d = m - sum(bugm['C0'].values()) / len(bugm['C0'])
                s += f' d={d*100:+.0f} [{lo*100:+.0f},{hi*100:+.0f}]'
            line.append(s)
        print(' | '.join(line))
    print('\nper bug U pass rate (C0 C1 C2 C3):')
    per = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in rows:
        if r['U']: per[r['tag']][r['cond']].append(r['Up'] / r['U'])
    for t in sorted(per, key=lambda t: (GROUP[t], t)):
        print(f"{GROUP[t]} {t:8}", ' '.join(f"{sum(per[t][c])/len(per[t][c])*100:4.0f}" if per[t][c] else '   -' for c in ['C0', 'C1', 'C2', 'C3']))
