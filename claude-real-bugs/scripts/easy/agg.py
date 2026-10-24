"""Aggregate the 135 scored runs: per bug x model hidden-case results, breakage, cost, time."""
import json, collections, statistics as st
REF = {'q624': 2, 'q629': 1}  # existing tests that the official fix itself changes (old behaviour asserted)
rows = [json.loads(l) for l in open('/home/claude/b15/scores.jsonl')]
for r in rows:
    d = f"/home/claude/b15/results/{r['run']}"
    res = None
    for l in open(d + '/run.jsonl', encoding='utf-8', errors='replace'):
        if '"type":"result"' in l:
            try: res = json.loads(l)
            except Exception: pass
    r['cost'] = res.get('total_cost_usd') if res else None
    r['turns'] = res.get('num_turns') if res else None
    r['denials'] = len(res.get('permission_denials', [])) if res else None
    r['seconds'] = int(open(d + '/seconds.txt').read().strip())
    r['broke'] = None if r['suite_failures'] is None else max(0, r['suite_failures'] - REF.get(r['bug'], 0))
    r['full'] = r['hidden_passed'] == r['hidden_total']
json.dump(rows, open('/home/claude/b15/final.json', 'w'), ensure_ascii=False, indent=0)
M = ['haiku', 'sonnet', 'opus']
bugs = sorted({r['bug'] for r in rows})
print('runs', len(rows), 'missing cost', sum(r['cost'] is None for r in rows), 'suite None', sum(r['suite_failures'] is None for r in rows))
for b in bugs:
    line = [b]
    for m in M:
        rs = sorted([r for r in rows if r['bug'] == b and r['tool'] == m], key=lambda r: r['rep'])
        line.append(f"{m[0]}:" + ','.join(f"{r['hidden_passed']}" for r in rs) + f"/{rs[0]['hidden_total']}" + (f" br{[r['broke'] for r in rs]}" if any(r['broke'] for r in rs) else ''))
    print('  '.join(line))
for m in M:
    rs = [r for r in rows if r['tool'] == m]
    print(m, 'runs', len(rs), 'full-fix', sum(r['full'] for r in rs), 'case rate %.3f' % (sum(r['hidden_passed'] for r in rs) / sum(r['hidden_total'] for r in rs)),
          'broke runs', sum(1 for r in rs if r['broke']), 'mean cost $%.3f' % st.mean(r['cost'] for r in rs),
          'median s', st.median(r['seconds'] for r in rs), 'mean denials %.1f' % st.mean(r['denials'] for r in rs))
# bugs where at least one model is not full on every run
print('differentiating bugs:')
for b in bugs:
    f = {m: sum(r['full'] for r in rows if r['bug'] == b and r['tool'] == m) for m in M}
    if len(set(f.values())) > 1 or min(f.values()) < 3: print('  ', b, f)
