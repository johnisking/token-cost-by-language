"""Scoring for the hard round of the Claude-only bug study (2026-10-24).

Each bug has a parent worktree with the maintainers' fix tests already applied (hb/w/<tag>/parent) and a fix worktree.
baseline: run the bug's test files at parent and fix -> target tests (fail at parent, pass at fix) and guard tests
          (pass at both). Saved to baseline.json.
score <run_dir>: apply the run's source changes to the parent worktree, build, run the same test files,
          count target tests passed and guard tests broken, then restore the parent worktree.
"""
import json, os, re, subprocess, sys, xml.etree.ElementTree as ET
HB = os.environ.get('HB', '/path/to/hb')  # worktrees: hb/w/<bug>/{parent,fix}, venv: hb/venv
PY = f'{HB}/venv/bin/python'
HERE = os.path.dirname(os.path.abspath(__file__))
ZOD_FILES = {'z6495': 'packages/zod/src/v4/classic/tests/default.test.ts packages/zod/src/v4/classic/tests/cyclic-data.test.ts',
             'z6496': 'packages/zod/src/v4/classic/tests/to-json-schema.test.ts'}
BUGS = {
    'z6495': dict(src=['packages/zod/src/'], kind='vitest'),
    'z6496': dict(src=['packages/zod/src/'], kind='vitest', skip=[r'linear']),
    'mit': dict(src=['more_itertools/'], kind='pytest', pp='.', files='tests/test_more.py'),
    'ct435': dict(src=['src/cachetools/'], kind='pytest', pp='src', files='tests/test_cachedmethod.py'),
    'pm1643': dict(src=['markdown/'], kind='pytest', pp='.', files='tests/test_syntax/blocks/test_html_blocks.py'),
    'pp653': dict(src=['pyparsing/'], kind='pytest', pp='.', files='tests/test_unit.py'),
    'mdit1201': dict(src=['src/'], kind='tap', files='test/markdown-it/markdown-it.test.mjs'),
    'jy791': dict(src=['src/'], kind='tap', build='node support/build-dist.mjs', files='"test/core/**/*.test.mjs"'),
    'mk4059': dict(src=['src/'], kind='tap', build='node esbuild.config.js', files='test/run-spec-tests.js test/unit/marked.test.js'),
    'mk4051': dict(src=['src/'], kind='tap', build='node esbuild.config.js', files='test/run-spec-tests.js test/unit/marked.test.js'),
}


def sh(cmd, cwd, timeout=1200):
    try:
        p = subprocess.run(['bash', '-c', cmd], cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return -1, 'TIMEOUT'


def parse_tap(out):
    res, stack = {}, []
    for line in out.splitlines():
        m = re.match(r'^(\s*)(not ok|ok) \d+ - (.*?)(?: # (SKIP|TODO).*)?$', line)
        if m:
            depth = len(m.group(1)) // 4
            stack = stack[:depth]
            name = ' > '.join(stack + [m.group(3).strip()])
            res[name] = m.group(2) == 'ok'
            continue
        m = re.match(r'^(\s*)# Subtest: (.*)$', line)
        if m:
            depth = len(m.group(1)) // 4
            stack = stack[:depth] + [m.group(2).strip()]
    # keep only leaves (a parent's result repeats its children)
    return {k: v for k, v in res.items() if not any(o != k and o.startswith(k + ' > ') for o in res)}


def run_tests(tag, d):
    b = BUGS[tag]
    if b.get('build'):
        sh(b['build'] + ' >/dev/null 2>&1', d)
    if b['kind'] == 'vitest':
        out = f'/tmp/hb_{tag}_{os.getpid()}.json'
        sh(f'npx vitest run --typecheck.enabled=false --reporter=json --outputFile={out} {ZOD_FILES[tag]}', d)
        try:
            j = json.load(open(out))
        except Exception:
            return None
        res = {}
        for tr in j['testResults']:
            for a in tr['assertionResults']:
                res[os.path.basename(tr['name']) + ' > ' + a['fullName']] = a['status'] == 'passed'
        return res
    if b['kind'] == 'pytest':
        xml = f'/tmp/hb_{tag}_{os.getpid()}.xml'
        sh(f'PYTHONPATH={b["pp"]} {PY} -m pytest -q -p no:cacheprovider --junitxml={xml} {b["files"]}', d)
        try:
            root = ET.parse(xml).getroot()
        except Exception:
            return None
        res = {}
        for tc in root.iter('testcase'):
            bad = any(c.tag in ('failure', 'error') for c in tc)
            if any(c.tag == 'skipped' for c in tc):
                continue
            res[f"{tc.get('classname')}::{tc.get('name')}"] = not bad
        return res
    rc, out = sh(f'node --test --test-reporter=tap {b["files"]}', d)
    return parse_tap(out)


def baseline():
    base = {}
    for tag in BUGS:
        p = run_tests(tag, f'{HB}/w/{tag}/parent'); f = run_tests(tag, f'{HB}/w/{tag}/fix')
        skip = BUGS[tag].get('skip', [])
        target = sorted(k for k in f if f[k] and k in p and not p[k] and not any(re.search(s, k, re.I) for s in skip))
        new_only = sorted(k for k in f if f[k] and k not in p)
        guard = sorted(k for k in f if f[k] and p.get(k))
        base[tag] = dict(target=target, guard=guard, missing_at_parent=new_only)
        print(tag, 'target', len(target), 'guard', len(guard), 'new-only', len(new_only), 'parent-total', len(p or {}), 'fix-total', len(f or {}))
    json.dump(base, open(f'{HERE}/baseline.json', 'w'), indent=1)


def filter_diff(diff, prefixes):
    keep = []
    for block in re.split(r'(?m)^(?=diff --git )', diff):
        m = re.match(r'diff --git a/(\S+) b/(\S+)', block)
        if m and any(m.group(2).startswith(p) for p in prefixes) and '/tests/' not in m.group(2) and '.test.' not in m.group(2):
            keep.append(block)
    return ''.join(keep)


def restore(d, prefixes):
    for p in prefixes:
        sh(f'git checkout -- {p} && git clean -fdq -- {p}', d)  # from the index, which holds the staged fix tests


def score(run):
    name = os.path.basename(run.rstrip('/'))
    tool, tag, rep = name.split('_')
    b = BUGS[tag]; d = f'{HB}/w/{tag}/parent'
    base = json.load(open(f'{HERE}/baseline.json'))[tag]
    raw = os.path.join(run, 'changes_raw.diff')
    diff = open(raw, encoding='utf-8', errors='surrogateescape').read() if os.path.exists(raw) else ''
    sd = filter_diff(diff, b['src'])
    restore(d, b['src'])
    applied = True
    if sd.strip():
        open(f'/tmp/hb_{name}.diff', 'w', encoding='utf-8', errors='surrogateescape', newline='').write(sd)
        rc, _ = sh(f'git apply --whitespace=nowarn /tmp/hb_{name}.diff', d)
        if rc:
            rc, _ = sh(f'patch -p1 -s --binary < /tmp/hb_{name}.diff', d); applied = rc == 0
    ut = os.path.join(run, 'untracked'); new_src = []
    for root, _, files in os.walk(ut):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), ut).replace(os.sep, '/')
            if any(rel.startswith(p) for p in b['src']) and '/tests/' not in rel and '.test.' not in rel:
                os.makedirs(os.path.dirname(os.path.join(d, rel)), exist_ok=True)
                open(os.path.join(d, rel), 'wb').write(open(os.path.join(root, fn), 'rb').read()); new_src.append(rel)
    res = run_tests(tag, d) or {}
    restore(d, b['src'])
    if b.get('build'):
        sh(b['build'] + ' >/dev/null 2>&1', d)
    passed = [t for t in base['target'] if res.get(t)]
    TIMING = re.compile(r'quadratic|linear|perf|timing|redos', re.I)  # time-budget tests flake under load; not counted
    broke = [t for t in base['guard'] if res.get(t) is False and not TIMING.search(t)]
    print(json.dumps(dict(run=name, tool=tool, bug=tag, rep=int(rep[1:]), src_changed=bool(sd.strip() or new_src), applied=applied,
                          hidden_passed=len(passed), hidden_total=len(base['target']),
                          hidden_failed=[t for t in base['target'] if not res.get(t)], broke=len(broke), broke_names=broke[:20],
                          results_found=len(res)), ensure_ascii=False))


if __name__ == '__main__':
    baseline() if sys.argv[1] == 'baseline' else score(sys.argv[2])
