import json, re, sys, glob, collections, statistics as st
Q = json.load(open('corpus/questions.json'))
C = json.load(open('corpus/corpus.json'))
PR = {'claude-haiku-5-5': (0.10, 0.50, 0.01), 'claude-sonnet-5-5': (2, 10, 0.10), 'claude-opus-5-5': (4, 20, 0.20), 'claude-fable-5-1': (10, 50, 0.25)}
def parse(ans):
    if not ans: return {}
    m = re.search(r'\{.*\}', ans, re.S)
    try: return json.loads(m.group(0)) if m else {}
    except Exception: return {}
def norm(s): return re.sub(r'\s|ms$', '', str(s).strip().lower().replace(',', '')) if s is not None else None
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1] + '/res_px_*.jsonl')) for l in open(f, encoding='utf-8')]
base = {(r['model'], r['doc']): r['inputTotal'] for r in rows if r['arm'] == 'base' and r.get('inputTotal')}
out = []
for r in rows:
    if r['arm'] == 'base' or not r.get('inputTotal'): continue
    a = parse(r['answer']); items = Q[r['doc']]
    sc = collections.defaultdict(lambda: [0, 0, 0])  # correct, wrong(confab), null
    for i, it in enumerate(items):
        v = a.get(str(i + 1))
        k = sc[it['type']]
        if v is None or str(v).lower() in ('null', 'none', ''): k[2] += 1
        elif norm(v) == norm(it['a']): k[0] += 1
        else: k[1] += 1
    out.append({**{k: r[k] for k in ('model', 'doc', 'arm', 'rep')}, 'tok': r['inputTotal'] - base[(r['model'], r['doc'])], 'score': {k: v for k, v in sc.items()}, 'output': r.get('output')})
json.dump(out, open(sys.argv[1] + '/scored.json', 'w'), indent=1)
# summary: per model x doc x arm
agg = collections.defaultdict(list)
for o in out: agg[(o['model'], o['doc'], o['arm'])].append(o)
for (m, d, a), os_ in sorted(agg.items()):
    tot = collections.Counter()
    for o in os_:
        for t, (c, w, n) in o['score'].items(): tot[t + '_c'] += c; tot[t + '_w'] += w; tot[t + '_n'] += n
    print(f"{m:18} {d:9} {a:4} tok {st.mean(o['tok'] for o in os_):8.0f}  " + ' '.join(f"{t}:{tot[t+'_c']}/{tot[t+'_c']+tot[t+'_w']+tot[t+'_n']}(w{tot[t+'_w']})" for t in ('planted_hex','planted_num','natural_hex','natural_num') if tot[t+'_c']+tot[t+'_w']+tot[t+'_n']))
