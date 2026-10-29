"""ds26 scoring (written 2026-10-25, before any run).

Each new bug has hb26/w/<id>/parent (parent source + the maintainers' fix tests + ds26 split checks) and hb26/w/<id>/fix.
K bugs reuse the dataset 25 scorers (b15/hard/hb_score.py and b15/score) unchanged.

baseline [N]: run each bug's test files N times at parent and at fix.
   target = passes at fix in every repeat and fails at parent in every repeat.
   guard  = passes at both in every repeat.
   flaky  = any test whose result differs between repeats at the same commit. Dropped from scoring.
   Every scored case gets an R/U/X label from labels.json.
score <run_dir>: apply the run's source changes to the parent worktree, run the same tests once,
   and record per-case pass/fail for targets and guards, then restore the parent worktree.
"""
import json, os, re, subprocess, sys, xml.etree.ElementTree as ET
HB = '/home/claude/hb26'
PY = f'{HB}/venv/bin/python'
HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = json.load(open(f'{HERE}/labels.json'))
TIMING = re.compile(r'timing|timeout|perf|speed|benchmark|slow', re.I)
CT_FILES = 'tests/test_ds26_cachetools.py tests/test_cachedmethod.py'
BUGS = {
    'ct443': dict(src=['src/cachetools/'], kind='pytest', pp='src', files=CT_FILES),
    'ct446': dict(src=['src/cachetools/'], kind='pytest', pp='src', files=CT_FILES),
    'ct437': dict(src=['src/cachetools/'], kind='pytest', pp='src', files=CT_FILES),
    'ct440': dict(src=['src/cachetools/'], kind='pytest', pp='src', files='tests/test_ds26_cachetools.py tests/test_ttl.py'),
    'pm1668': dict(src=['markdown/'], kind='pytest', pp='.', files='tests/test_syntax/inline/test_code.py'),
    'any1273': dict(src=['src/anyio/'], kind='pytest', pp='src', files='tests/test_sockets.py', extra='-p anyio.pytest_plugin --timeout=60'),
    'any1364': dict(src=['src/anyio/'], kind='pytest', pp='src', files='tests/test_sockets.py', extra='-p anyio.pytest_plugin --timeout=60'),
    'du1369': dict(src=['src/dateutil/'], kind='pytest', pp='src', files='tests/test_rrule.py tests/property/test_rrule_prop.py'),
    'z6641': dict(src=['packages/zod/src/'], kind='vitest',
                  files='packages/zod/src/v4/classic/tests/ds26_zod.test.ts packages/zod/src/v4/classic/tests/record.test.ts packages/zod/src/v4/core/tests/compile.test.ts'),
    'z6659': dict(src=['packages/zod/src/'], kind='vitest',
                  files='packages/zod/src/v4/classic/tests/ds26_zod.test.ts packages/zod/src/v4/classic/tests/union.test.ts'),
    'fy7073': dict(src=['lib/', 'fastify.js'], kind='tap', files='test/ds26_fastify.test.js test/diagnostics-channel/error-status.test.js test/reply-error.test.js'),
    'pq256': dict(src=['source/'], kind='tap', node='node --import=tsx/esm', files='test/advanced.ts'),
    'un5981': dict(src=['lib/', 'index.js'], kind='tap', files='test/issue-5981.js test/pool.js'),
}


def sh(cmd, cwd, timeout=1800):
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
            if m.group(4):
                continue
            depth = len(m.group(1)) // 4
            stack = stack[:depth]
            res[' > '.join(stack + [m.group(3).strip()])] = m.group(2) == 'ok'
            continue
        m = re.match(r'^(\s*)# Subtest: (.*)$', line)
        if m:
            depth = len(m.group(1)) // 4
            stack = stack[:depth] + [m.group(2).strip()]
    return {k: v for k, v in res.items() if not any(o != k and o.startswith(k + ' > ') for o in res)}


def run_tests(tag, d):
    b = BUGS[tag]
    if b['kind'] == 'vitest':
        out = f'/tmp/hb26_{tag}_{os.getpid()}.json'
        if os.path.exists(out):
            os.remove(out)
        sh(f'node node_modules/vitest/vitest.mjs run --typecheck.enabled=false --reporter=json --outputFile={out} {b["files"]}', d)
        try:
            j = json.load(open(out))
        except Exception:
            return None
        res = {}
        for tr in j['testResults']:
            proj = 'compile' if 'compile-mode' in json.dumps(tr.get('name', '')) else ''
            for a in tr['assertionResults']:
                k = os.path.basename(tr['name']) + ' > ' + a['fullName']
                while k in res:  # same file run by the second vitest project (compiled mode)
                    k += ' [compiled]'
                if a['status'] in ('passed', 'failed'):
                    res[k] = a['status'] == 'passed'
        return res
    if b['kind'] == 'pytest':
        xml = f'/tmp/hb26_{tag}_{os.getpid()}.xml'
        if os.path.exists(xml):
            os.remove(xml)
        sh(f'PYTHONPATH={b["pp"]} {PY} -m pytest -q -p no:cacheprovider {b.get("extra", "")} --junitxml={xml} {b["files"]}', d)
        try:
            root = ET.parse(xml).getroot()
        except Exception:
            return None
        res = {}
        for tc in root.iter('testcase'):
            if any(c.tag == 'skipped' for c in tc):
                continue
            res[f"{tc.get('classname')}::{tc.get('name')}"] = not any(c.tag in ('failure', 'error') for c in tc)
        return res
    rc, out = sh(f'{b.get("node", "node")} --test --test-reporter=tap {b["files"]}', d)
    return parse_tap(out)


def label(tag, case):
    for pat, lab in LABELS['new'][tag]:
        if re.search(pat, case):
            return lab
    return 'G'  # not a maintainer case for this bug: ordinary guard (breakage only)


def baseline(n=5, only=None):
    path = f'{HERE}/baseline26.json'
    base = json.load(open(path)) if os.path.exists(path) else {}
    for tag in BUGS:
        if only and tag not in only:
            continue
        P = [run_tests(tag, f'{HB}/w/{tag}/parent') or {} for _ in range(n)]
        F = [run_tests(tag, f'{HB}/w/{tag}/fix') or {} for _ in range(n)]
        keys = set().union(*P, *F)
        flaky = sorted(k for k in keys if len({r.get(k) for r in P}) > 1 or len({r.get(k) for r in F}) > 1)
        target = sorted(k for k in keys if k not in flaky and all(r.get(k) is True for r in F) and all(r.get(k) is False for r in P))
        guard = sorted(k for k in keys if k not in flaky and all(r.get(k) is True for r in F) and all(r.get(k) is True for r in P))
        cases = {k: label(tag, k) for k in target + guard}
        cases = {k: v for k, v in cases.items() if v != 'X'}
        base[tag] = dict(target=[k for k in target if k in cases], guard=[k for k in guard if k in cases], labels=cases, flaky=flaky,
                         parent_total=[len(r) for r in P], fix_total=[len(r) for r in F])
        rt = [k for k in base[tag]['target'] if cases[k] == 'R']; ut = [k for k in base[tag]['target'] if cases[k] == 'U']
        ug = [k for k in base[tag]['guard'] if cases[k] == 'U']
        print(f'{tag}: target R{len(rt)} U{len(ut)} | U-guard {len(ug)} | guard {len(base[tag]["guard"]) - len(ug)} | flaky {len(flaky)} | totals P{base[tag]["parent_total"]} F{base[tag]["fix_total"]}', flush=True)
        json.dump(base, open(path, 'w'), indent=1)


def filter_diff(diff, prefixes):
    keep = []
    for block in re.split(r'(?m)^(?=diff --git )', diff):
        m = re.match(r'diff --git a/(\S+) b/(\S+)', block)
        if m and any(m.group(2).startswith(p) for p in prefixes) and '/tests/' not in m.group(2) and '.test.' not in m.group(2):
            keep.append(block)
    return ''.join(keep)


def score(run):
    """run dir holds diff.patch (git diff of the run against its base) and meta.json; name: <model>_<cond>_<tag>_<rep>."""
    name = os.path.basename(run.rstrip('/'))
    model, cond, tag, rep = name.split('_')
    b = BUGS[tag]; d = f'{HB}/w/{tag}/parent'
    base = json.load(open(f'{HERE}/baseline26.json'))[tag]
    diff = filter_diff(open(f'{run}/diff.patch', encoding='utf-8', errors='replace').read(), b['src'])
    sh('git init -q 2>/dev/null; git add -A >/dev/null 2>&1; git -c user.name=s -c user.email=s@x commit -qm base >/dev/null 2>&1', d)
    applied = True
    if diff.strip():
        open(f'/tmp/hb26_{name}.patch', 'w').write(diff)
        rc, out = sh(f'git apply --whitespace=nowarn /tmp/hb26_{name}.patch', d)
        applied = rc == 0
    res = run_tests(tag, d) if applied else {}
    sh('git checkout -q -- . && git clean -fdq', d)
    res = res or {}
    case = {k: res.get(k) is True for k in base['target'] + base['guard']}
    broke = [k for k in base['guard'] if base['labels'][k] == 'G' and res.get(k) is False and not TIMING.search(k)]
    return dict(run=name, model=model, cond=cond, tag=tag, rep=rep, applied=applied, empty=not diff.strip(), cases=case,
                broke=len(broke), broke_names=broke[:20])


if __name__ == '__main__':
    if sys.argv[1] == 'baseline':
        baseline(int(sys.argv[2]) if len(sys.argv) > 2 else 5, sys.argv[3].split(',') if len(sys.argv) > 3 else None)
    elif sys.argv[1] == 'score':
        print(json.dumps(score(sys.argv[2])))
