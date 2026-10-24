"""Score one run of the Claude-only bug study.
usage: python3 score_run.py <run_dir>   (run_dir holds changes.diff; name is <tool>_<bug>_r<n>)
Applies only the run's source changes to a clean copy of the parent commit, then
 1. runs the hidden cases (cases.mjs, taken from the maintainers' tests), and
 2. runs the project's existing test suite and counts failures (the parent passes it).
Prints one JSON line."""
import json, os, re, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
W = os.path.join(HERE, '..', 'w')
SRC = {'y': ['src/'], 'd': ['src/'], 'q': ['lib/'], 'p': ['papaparse.js'], 'm': ['src/'],
       'h': ['src/'], 't': ['tomlkit/'], 'i': ['more_itertools/']}
PY = '/home/claude/b15/venv/bin/python'
PYT = PY + ' -m pytest -q -rf -p no:cacheprovider --benchmark-disable --ignore=tests/test_toml_tests.py tests'
D_TESTS = "$(ls test/*/*.js test/*.js | grep -v readme-rename)"
SUITE = {
    'y': 'node support/build-dist.mjs >/dev/null 2>&1; node --test "test/core/**/*.test.mjs"',
    'd': 'node node_modules/mocha/bin/mocha.js --timeout 20000 ' + D_TESTS,
    'q': 'node node_modules/tape/bin/tape "test/**/*.js"',
    'p': 'node node_modules/mocha/bin/mocha tests/node-tests.js tests/test-cases.js',
    'm': 'node --test "test/markdown-it/**/*.test.mjs"',
    'h': 'PYTHONPATH=src ' + PYT,
    't': 'PYTHONPATH=. ' + PYT,
    'i': 'PYTHONPATH=. ' + PYT,
}


def sh(cmd, cwd, timeout=900):
    try:
        p = subprocess.run(['bash', '-c', cmd], cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return -1, 'TIMEOUT'


def fail_names(kind, out):
    if kind in 'ym':
        return sorted(set(re.findall(r'^\s*\u2716 (.+?)(?: \([\d.]+ms\))?$', out, re.M)))
    if kind == 'q':
        return sorted(set(re.findall(r'^not ok \d+ (.*)$', out, re.M)))
    if kind in 'dp':
        return sorted(set(re.findall(r'^\s+\d+\) (.+)$', out, re.M)))
    return sorted(set(re.findall(r'^FAILED (\S+)', out, re.M)))


def failures(kind, out):
    if out == 'TIMEOUT':
        return None
    if kind in 'hti':
        if re.search(r'(\d+) failed', out): return int(re.search(r'(\d+) failed', out).group(1))
        return 0 if re.search(r'\d+ passed', out) else None
    if kind in 'ym':
        m = re.search(r'^# fail (\d+)', out, re.M); return int(m.group(1)) if m else None
    if kind == 'q':
        m = re.search(r'^# fail\s+(\d+)', out, re.M)
        return int(m.group(1)) if m else (0 if re.search(r'^# ok', out, re.M) else None)
    m = re.search(r'(\d+) failing', out)
    return int(m.group(1)) if m else (0 if re.search(r'\d+ passing', out) else None)


def filter_diff(diff, prefixes):
    keep, cur = [], None
    for block in re.split(r'(?m)^(?=diff --git )', diff):
        m = re.match(r'diff --git a/(\S+) b/(\S+)', block)
        if m and any(m.group(2).startswith(p) for p in prefixes):
            keep.append(block)
    return ''.join(keep)


def main(run):
    name = os.path.basename(run.rstrip('/'))
    tool, bug, rep = name.split('_')
    kind = bug[0]
    tmp = f'/tmp/b15score/{name}'
    shutil.rmtree(tmp, ignore_errors=True)
    shutil.copytree(os.path.join(W, bug), tmp, symlinks=True, ignore=shutil.ignore_patterns('.git'))
    raw = os.path.join(run, 'changes_raw.diff')
    diff = open(raw if os.path.exists(raw) else os.path.join(run, 'changes.diff'), encoding='utf-8', errors='surrogateescape').read()
    sd = filter_diff(diff, SRC[kind])
    applied = True
    if sd.strip():
        open(f'{tmp}.diff', 'w', encoding='utf-8', errors='surrogateescape', newline='').write(sd)
        rc, out = sh(f'git apply --whitespace=nowarn {tmp}.diff', tmp)
        if rc != 0:
            rc, out = sh(f'patch -p1 -s --binary < {tmp}.diff', tmp); applied = rc == 0
    ut = os.path.join(run, 'untracked')
    new_src = []
    for root, _, files in os.walk(ut):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), ut).replace(os.sep, '/')
            if any(rel.startswith(p) for p in SRC[kind]):
                os.makedirs(os.path.dirname(os.path.join(tmp, rel)), exist_ok=True)
                shutil.copy(os.path.join(root, fn), os.path.join(tmp, rel)); new_src.append(rel)
    sh(f'{HERE}/build.sh {bug} {tmp}', HERE)
    if kind in 'hti':
        if kind == 'h':
            open(f'{tmp}/src/humanize/_version.py', 'w').write('__version__ = version = "4.15.0"\n')
        rc, out = sh(f'{PY} {HERE}/cases.py {bug} {tmp}', HERE, 300)
    else:
        rc, out = sh(f'node {HERE}/cases.mjs {bug} {tmp}', HERE, 300)
    try:
        cases = json.loads(out.strip().splitlines()[-1])
    except Exception:
        cases = {'passed': 0, 'total': None, 'cases': [], 'error': out[-300:]}
    rc, out = sh(SUITE[kind], tmp)
    fails = failures(kind, out)
    res = dict(run=name, tool=tool, bug=bug, rep=int(rep[1:]), src_changed=bool(sd.strip()) or bool(new_src), new_src_files=new_src, applied=applied,
               hidden_passed=cases.get('passed'), hidden_total=cases.get('total'),
               hidden_failed=[c['name'] for c in cases.get('cases', []) if not c['ok']],
               suite_failures=fails, suite_failed_names=fail_names(kind, out)[:50])
    shutil.rmtree(tmp, ignore_errors=True)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
