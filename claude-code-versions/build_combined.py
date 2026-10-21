"""Combine the PC results into combined.json for the data page.
Inputs (copied from the PC): first_call.json, results_clean.json, results_connectors.json; npm_times.json (npm publish dates).
Connector tool names are reduced to counts (they name the apps on our account)."""
import json, statistics, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '.'
H = os.path.dirname(os.path.abspath(__file__))
FC = json.load(open(os.path.join(D, 'first_call.json')))
T = json.load(open(os.path.join(H, 'npm_times.json')))
key = lambda v: tuple(map(int, v.split('.')))
rows = []
for arm in ('clean', 'connectors'):
    R = json.load(open(os.path.join(D, f'results_{arm}.json')))
    for v in sorted(R, key=key):
        if 'runs' not in R[v]: continue
        ok = [r for r in R[v]['runs'] if r.get('usage_total')]
        fc = [x['first_call_input'] for x in FC.get(arm, {}).get(v, [])]
        if not ok or not fc: continue
        tools = ok[0].get('tools') or []
        builtin = sorted(t for t in tools if not t.startswith('mcp__'))
        rows.append(dict(version=v, released=T[v][:10], arm=arm, runs=len(fc), first_request_input_tokens=int(statistics.median(fc)),
                         min=min(fc), max=max(fc), tools=len(tools), builtin_tools=len(builtin), mcp_tools=len(tools) - len(builtin),
                         connected_servers=len([m for m in (ok[0].get('mcp') or []) if m.get('status') == 'connected']),
                         builtin_tool_names=builtin, cache_write_1h=bool(((ok[0].get('usage') or {}).get('cache_creation') or {}).get('ephemeral_1h_input_tokens'))))
fails = []
R = json.load(open(os.path.join(D, 'results_clean.json')))
for v in R:
    if 'install_error' in R[v]: fails.append(dict(version=v, released=T[v][:10], reason='npm install refused on Windows (system requirements)'))
json.dump(dict(model='claude-haiku-5-5', prompt='a', measured='2026-10-21', rows=rows, not_measured=sorted(fails, key=lambda f: key(f['version']))),
          open(os.path.join(H, 'combined.json'), 'w'), indent=1)
for r in rows:
    if r['arm'] == 'clean': print(r['version'], r['released'], r['first_request_input_tokens'], r['builtin_tools'], r['min'] == r['max'])
print(len(rows), 'rows;', len(fails), 'not measured')
