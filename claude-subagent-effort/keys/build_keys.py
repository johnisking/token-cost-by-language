import json, re, subprocess, os, hashlib
SRC = '/home/claude/ds27/src'
Q = [
 dict(id='U1', repo='undici', scope='lib', ext='.js', pat=r'new RequestAbortedError\(', excl=[],
      q="In this repository's library code (lib/), find every place where a RequestAbortedError is created. For each one, give the file and the enclosing function or method."),
 dict(id='U2', repo='undici', scope='lib', ext='.js', pat=r'new (HeadersTimeoutError|BodyTimeoutError)\(', excl=[],
      q="In this repository's library code (lib/), find every place where a HeadersTimeoutError or a BodyTimeoutError is created. For each one, give the file and the enclosing function or method."),
 dict(id='F1', repo='fastify', scope='lib', ext='.js', pat=r'FST_ERR_CTP_[A-Z_]+', excl=['lib/errors.js'],
      q="In this repository's library code (lib/), find every place outside lib/errors.js that throws or returns one of the content-type-parser errors (the FST_ERR_CTP_* codes). For each one, give the file and the enclosing function."),
 dict(id='F2', repo='fastify', scope='lib', ext='.js', pat=r'FST_ERR_HOOK_[A-Z_]+', excl=['lib/errors.js'],
      q="In this repository's library code (lib/), find every place outside lib/errors.js that throws or returns one of the hook errors (the FST_ERR_HOOK_* codes). For each one, give the file and the enclosing function."),
 dict(id='C1', repo='cachetools', scope='src', ext='.py', pat=r'def (__setitem__|popitem)\(', excl=[],
      q="In this library, list every class that defines its own __setitem__ or popitem method. For each, give the file, the class and which of the two methods it defines."),
 dict(id='C2', repo='cachetools', scope='src', ext='.py', pat=r'\.expire\(', excl=[],
      q="In this library's source code, find every method or function that calls expire(). For each call, give the file and the enclosing class and method."),
 dict(id='M1', repo='markdown', scope='markdown', ext='.py', pat=r'treeprocessors\.register\(', excl=[],
      q="In this package's source (the markdown/ directory), find every place that registers a tree processor (treeprocessors.register). For each, give the file and the enclosing class and method."),
 dict(id='M2', repo='markdown', scope='markdown', ext='.py', pat=r'^class \w+\([^)]*InlineProcessor\)', excl=[],
      q="In this package's source (the markdown/ directory), list every class that subclasses an InlineProcessor class (directly, by naming a class ending in InlineProcessor as its base). Give the file and class name for each."),
 dict(id='A1', repo='anyio', scope='src', ext='.py', pat=r'raise BrokenResourceError', excl=[],
      q="In this library's source code (src/), find every place that raises BrokenResourceError. For each, give the file and the enclosing class and method."),
 dict(id='A2', repo='anyio', scope='src', ext='.py', pat=r'(async )?def aclose\(', excl=[],
      q="In this library's source code (src/), list every class that implements an aclose() method. Give the file and the class for each."),
 dict(id='Z1', repo='zod', scope='packages/zod/src/v4/core', ext='.ts', pat=r'\.coerce\b|def\.coerce', excl=[], notpath='tests',
      q="In zod's v4 core (packages/zod/src/v4/core, excluding tests), find every place that reads the coerce option of a schema definition. For each, give the file and the enclosing function."),
 dict(id='Z2', repo='zod', scope='packages/zod/src/v4', ext='.ts', pat=r'new (core\.)?\$ZodAsyncError\(', excl=[], notpath='tests',
      q="In zod's v4 source (packages/zod/src/v4, excluding tests), find every place that throws $ZodAsyncError, the error raised when a Promise shows up during synchronous parsing. For each, give the file and the enclosing function."),
]
out = []
for d in Q:
    root = os.path.join(SRC, d['repo'])
    hits = {}
    for dp, dn, fn in os.walk(os.path.join(root, d['scope'])):
        if 'node_modules' in dp or (d.get('notpath') and d['notpath'] in dp.split(os.sep)): continue
        for f in fn:
            if not f.endswith(d['ext']) or f.endswith('.test.ts') or f.endswith('.d.ts'): continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
            if rel in d['excl']: continue
            for i, line in enumerate(open(p, encoding='utf-8', errors='replace'), 1):
                if re.search(d['pat'], line): hits.setdefault(rel, []).append(i)
    items = set()
    for rel, ls in hits.items():
        tool = ['node', '/home/claude/ds27/enclose.js'] if d['ext'] != '.py' else ['python3', '/home/claude/ds27/enclose.py']
        r = subprocess.run(tool + [os.path.join(root, rel), ','.join(map(str, ls))], capture_output=True, text=True)
        for row in r.stdout.strip().splitlines():
            ln, name = row.split('\t')
            if d['id'] in ('M2',):
                name = re.search(r'class (\w+)', open(os.path.join(root, rel)).read().splitlines()[int(ln)-1]).group(1)
            if d['id'] in ('A2', 'C1'):
                pass
            if name == '<module>': continue
            items.add((rel, name))
    d['key'] = sorted([{'file': f, 'symbol': s.split('|')[0], 'accept': (s.split('|')[:1] if d['ext']=='.py' else s.split('|'))} for f, s in items], key=lambda x: (x['file'], x['symbol']))
    d['commit'] = subprocess.run(['git', '-C', root, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    out.append(d)
    print(d['id'], len(d['key']), 'items', len(hits), 'files')
    for k in d['key']: print('   ', k['file'], ' | '.join(k['accept']))
json.dump(out, open('/home/claude/ds27/questions.json', 'w'), indent=1)
print(hashlib.sha256(open('/home/claude/ds27/questions.json', 'rb').read()).hexdigest())
