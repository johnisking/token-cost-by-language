"""Six documents (~same size class) with 5 planted facts each: one 12-char hex id + one number per fact.
Seeded, so the corpus is reproducible."""
import json, random, re
R = random.Random(20261021)
SRC = './'
hexid = lambda: ''.join(R.choice('0123456789abcdef') for _ in range(12))

def facts():
    out = []
    for i in range(5):
        out.append({'ticket': f'T{R.randint(100, 999)}', 'hex': hexid(), 'num': R.randint(1000, 99999)})
    return out

LINES = {
 'en': lambda f: f"Note: ticket {f['ticket']} uses build hash {f['hex']} and a timeout of {f['num']} ms.",
 'ko': lambda f: f"참고: 티켓 {f['ticket']}의 빌드 해시는 {f['hex']}이고 제한 시간은 {f['num']}ms이다.",
 'ja': lambda f: f"注記：チケット {f['ticket']} のビルドハッシュは {f['hex']}、タイムアウトは {f['num']} ms。",
 'code': lambda f: f"// ticket {f['ticket']}: build hash {f['hex']}, timeout {f['num']} ms",
 'json': lambda f: f'{{"ticket": "{f["ticket"]}", "build": "{f["hex"]}", "timeout_ms": {f["num"]}}},',
 'log': lambda f: f"2026-10-20T11:{R.randint(10,59)}:{R.randint(10,59)}Z INFO deploy ticket={f['ticket']} build={f['hex']} timeout_ms={f['num']}",
}

def plant(text, kind, fs):
    lines = text.split('\n')
    n = len(lines)
    for k, f in enumerate(fs):             # spread over the document: 10%, 28%, 46%, 64%, 82%
        pos = int(n * (0.10 + 0.18 * k)) + k
        lines.insert(pos, LINES[kind](f))
    return '\n'.join(lines)

def strip_md(s):
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    return s

docs = {}
for lang in ('en', 'ko', 'ja'):
    docs['prose_' + lang] = (lang, strip_md(open(SRC + f'blog_src/cc-cost-{lang}.md', encoding='utf-8').read()))
docs['code'] = ('code', open(SRC + 'src/ccusage.js', encoding='utf-8').read()[:14000])
# JSON: realistic API response, pretty-printed
models = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'gpt-6.1-sol', 'gemini-3.8-flash']
recs = []
for i in range(60):
    recs.append({'id': f'req_{hexid()}{hexid()[:6]}', 'model': R.choice(models), 'created': f'2026-10-{R.randint(1,20):02d}T{R.randint(0,23):02d}:{R.randint(0,59):02d}:00Z',
                 'usage': {'input_tokens': R.randint(200, 90000), 'output_tokens': R.randint(20, 8000), 'cache_read_input_tokens': R.randint(0, 200000)},
                 'status': R.choice(['ok', 'ok', 'ok', 'error']), 'project': R.choice(['web', 'api', 'game', 'docs'])})
docs['json'] = ('json', json.dumps({'data': recs}, indent=2))
# Log
paths = ['/v1/messages', '/v1/count_tokens', '/healthz', '/api/usage', '/api/plans', '/static/app.js']
log = []
for i in range(230):
    log.append(f"2026-10-20T{10 + i // 60:02d}:{i % 60:02d}:{R.randint(10,59)}Z {R.choice(['INFO','INFO','INFO','WARN','ERROR'])} {R.choice(['GET','POST'])} {R.choice(paths)} status={R.choice([200,200,200,201,404,429,500])} req={hexid()} latency_ms={R.randint(3, 4000)} bytes={R.randint(120, 90000)}")
docs['log'] = ('log', '\n'.join(log))

out = {}
for name, (kind, text) in docs.items():
    fs = facts()
    t = plant(text, kind, fs)
    out[name] = {'kind': kind, 'chars': len(t), 'facts': fs, 'text': t}
    open(f'corpus/{name}.txt', 'w', encoding='utf-8').write(t)
    print(name, len(t))
json.dump(out, open('corpus/corpus.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
