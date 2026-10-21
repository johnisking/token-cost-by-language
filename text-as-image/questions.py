import json, random, re, collections
R = random.Random(7)
C = json.load(open('corpus/corpus.json')); P = json.load(open('corpus/payloads.json'))
Q = {}
for name, d in C.items():
    items = []
    for f in d['facts']:
        items.append({'q': f"ticket {f['ticket']}: build hash", 'a': f['hex'], 'type': 'planted_hex'})
        items.append({'q': f"ticket {f['ticket']}: timeout in ms", 'a': str(f['num']), 'type': 'planted_num'})
    fs = '\n'.join(P[name]['spaced']['texts'])
    if name == 'log':
        lines = [l for l in d['text'].split('\n') if ' req=' in l]
        cand = [l for l in lines if re.search(r'req=(\w+)', l).group(1) not in fs]
        for l in R.sample(cand, 5):
            ts = l.split(' ')[0]
            items.append({'q': f"log line at {ts}: req id", 'a': re.search(r'req=(\w+)', l).group(1), 'type': 'natural_hex'})
            items.append({'q': f"log line at {ts}: latency_ms", 'a': re.search(r'latency_ms=(\d+)', l).group(1), 'type': 'natural_num'})
    if name == 'json':
        recs = json.loads(re.sub(r'\n\{"ticket".*?\},', '', d['text']))['data']
        cnt = collections.Counter(r['created'] for r in recs)
        uniq = [r for r in recs if cnt[r['created']] == 1 and r['id'] not in fs]
        for r in R.sample(uniq, 5):
            items.append({'q': f"record created {r['created']}: id", 'a': r['id'], 'type': 'natural_hex'})
            items.append({'q': f"record created {r['created']}: output_tokens", 'a': str(r['usage']['output_tokens']), 'type': 'natural_num'})
    Q[name] = items
    print(name, len(items), collections.Counter(i['type'] for i in items))
json.dump(Q, open('corpus/questions.json', 'w'), indent=1)
