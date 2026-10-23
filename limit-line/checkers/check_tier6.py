"""Tier 6 checker (2026-10-23): real marked bugs.

For each run folder <tool>_t6<task>_r<n>/work: take a clean checkout of the commit before the upstream fix,
copy in only the run's src/ (so edited tests or specs cannot change the score), add the upstream fix's spec
files as hidden tests, build with esbuild and run marked's spec suite (test/run-spec-tests.js).
  solved      the hidden spec passes
  regressions spec tests that pass on the unfixed checkout but fail after the run's change
  points      1 if solved and no regressions, else 0
usage: python3 check_tier6.py <runs_dir> <marked_git_dir> <scorer_dir> > tier6.json
"""
import io, json, os, re, shutil, subprocess, sys, tarfile, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = {'t1': '123ce04b', 't2': 'cc07bb9c', 't3': '6a57018f'}


def tree(git, ref, dest):
    tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git', '-C', git, 'archive', ref]))).extractall(dest)


def hidden(git, c, dest):
    os.makedirs(dest, exist_ok=True)
    for f in subprocess.check_output(['git', '-C', git, 'diff', '--name-only', c + '^', c, '--', 'test/specs'], text=True).split():
        b = subprocess.run(['git', '-C', git, 'show', f'{c}:{f}'], capture_output=True)
        if b.returncode == 0: open(os.path.join(dest, os.path.basename(f)), 'wb').write(b.stdout)


def score(scorer, repo, hid):
    r = subprocess.run(['node', 'score.mjs', repo, hid], cwd=scorer, capture_output=True, text=True, timeout=900)
    return json.loads(r.stdout.strip().splitlines()[-1])


def diffstat(a, b):
    r = subprocess.run(['git', 'diff', '--no-index', '--numstat', a, b], capture_output=True, text=True)
    add = rem = files = 0
    for l in r.stdout.splitlines():
        p = l.split('\t')
        if len(p) >= 2 and p[0].isdigit(): add += int(p[0]); rem += int(p[1]); files += 1
    return {'files': files, 'added': add, 'removed': rem}


def main():
    runs, git, scorer = (os.path.abspath(x) for x in sys.argv[1:4])
    tmp = tempfile.mkdtemp(prefix='t6score_', dir=os.path.dirname(runs))
    base = {}
    out = {}
    for d in sorted(os.listdir(runs)):
        m = re.match(r'(\w+)_t6(t\d)_r(\d+)$', d)
        if not m: continue
        task = m.group(2); c = FIX[task]
        hid = os.path.join(tmp, 'hidden_' + task)
        if task not in base:
            hidden(git, c, hid)
            b = os.path.join(tmp, 'base_' + task); tree(git, c + '^', b)
            base[task] = set(score(scorer, b, hid)['failed'])
        src = os.path.join(runs, d, 'work', 'src')
        if not os.path.isdir(src):
            out[d] = {'points': 0, 'missing': True}; continue
        repo = os.path.join(tmp, d); tree(git, c + '^', repo)
        clean_src = os.path.join(tmp, 'src_' + task)
        if not os.path.exists(clean_src): shutil.copytree(os.path.join(repo, 'src'), clean_src)
        shutil.rmtree(os.path.join(repo, 'src')); shutil.copytree(src, os.path.join(repo, 'src'))
        r = score(scorer, repo, hid)
        res = {'build': r['build']}
        if r['build']:
            hid_names = list(r['hidden'])
            res['solved'] = all(r['hidden'].values())
            res['regressions'] = sorted(f for f in set(r['failed']) - base[task] if not any(h in f for h in hid_names))
            res['points'] = int(res['solved'] and not res['regressions'])
        else:
            res.update(solved=False, regressions=[], points=0, build_error=r.get('build_error'))
        res['diff'] = diffstat(clean_src, src)
        if r['build']:  # cases of the hidden spec passed one by one (the spec file counts as one test above)
            md = [f for f in os.listdir(hid) if f.endswith('.md')][0]
            pr = subprocess.run(['node', os.path.join(HERE, 't6_partial.mjs'), os.path.join(repo, 'lib', 'marked.esm.js'),
                                 os.path.join(hid, md), os.path.join(hid, md[:-3] + '.html')], capture_output=True, text=True)
            res['cases'] = pr.stdout.strip()
        out[d] = res
        print(d, res['points'], 'solved', res['solved'], 'regressions', len(res['regressions']), res.get('cases'), res['diff'], file=sys.stderr, flush=True)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
