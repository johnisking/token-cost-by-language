"""Score a folder of ds26 runs (unpacked from the PC). Usage: python3 score_all.py <runs_dir> <out.jsonl>
New bugs (N/H) -> score26.score. K bugs -> the unchanged dataset 25 scorers (hard/hb_score.py, score/score_run.py).
anyio bugs are skipped here (scored on the PC). One bug at a time per worktree; bugs run in parallel."""
import json, os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score26
RUNS, OUT = sys.argv[1], sys.argv[2]
HARD = {'ct435', 'jy791', 'pm1643', 'z6495', 'z6496', 'mk4051'}
EASY = {'q629', 't336'}
SKIP = {'any1273', 'any1364'}
ADAPT = '/tmp/b26adapt'
done = set()
if os.path.exists(OUT):
    done = {json.loads(l)['run'] for l in open(OUT) if l.strip()}


def k_score(name, script):
    model, cond, tag, rep = name.split('_')
    d = f'{ADAPT}/{model}{cond}_{tag}_{rep}'
    os.makedirs(d, exist_ok=True)
    shutil.copy(f'{RUNS}/{name}/diff.patch', f'{d}/changes_raw.diff')
    p = subprocess.run(['python3', script, 'score', d] if 'hb_score' in script else ['python3', script, d],
                       capture_output=True, text=True, timeout=3600)
    line = [l for l in p.stdout.splitlines() if l.startswith('{')]
    r = json.loads(line[-1]) if line else {'error': (p.stdout + p.stderr)[-400:]}
    r.update(run=name, model=model, cond=cond, tag=tag, rep=rep, scorer='ds25')
    return r


def one(name):
    model, cond, tag, rep = name.split('_')
    if tag in HARD:
        return k_score(name, '/home/claude/b15/hard/hb_score.py')
    if tag in EASY:
        return k_score(name, '/home/claude/b15/score/score_run.py')
    r = score26.score(f'{RUNS}/{name}'); r['scorer'] = 'ds26'
    return r


def per_bug(tag, names):
    out = []
    for n in sorted(names):
        try:
            r = one(n)
        except Exception as e:
            r = dict(run=n, error=repr(e)[:300])
        with open(OUT, 'a') as f:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
        out.append(r)
    return tag, len(out)


groups = {}
for n in os.listdir(RUNS):
    tag = n.split('_')[2]
    if tag in SKIP or n in done:
        continue
    groups.setdefault(tag, []).append(n)
# python (pytest) bugs are light; node bugs heavier. 4 bugs at once.
with ThreadPoolExecutor(4) as ex:
    for tag, k in ex.map(lambda kv: per_bug(*kv), sorted(groups.items(), key=lambda kv: -len(kv[1]))):
        print(tag, k, flush=True)
