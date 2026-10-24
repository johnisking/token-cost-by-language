"""Build dataset 25 (Claude-only bug study, 2026-10-24): 225 Claude Code runs on 25 real bugs from 13 open-source projects.
Inputs: /home/claude/b15/final.json (easy round, 135 runs) and /home/claude/b15/hard/final_hard.json (hard round, 90 runs).
Output: dataset/claude-haiku-vs-opus-real-bugs.{json,csv}"""
import csv, io, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'hard'))
OUT = os.path.join(HERE, 'dataset'); os.makedirs(OUT, exist_ok=True)
EASY = os.environ.get('B15_EASY', '/home/claude/b15/final.json')
HARD = os.environ.get('B15_HARD', '/home/claude/b15/hard/final_hard.json')

P = {  # project: (repo, language)
    'js-yaml': ('nodeca/js-yaml', 'JavaScript'), 'jsdiff': ('kpdecker/jsdiff', 'TypeScript'), 'qs': ('ljharb/qs', 'JavaScript'),
    'PapaParse': ('mholt/PapaParse', 'JavaScript'), 'markdown-it': ('markdown-it/markdown-it', 'JavaScript'),
    'humanize': ('python-humanize/humanize', 'Python'), 'tomlkit': ('python-poetry/tomlkit', 'Python'),
    'more-itertools': ('more-itertools/more-itertools', 'Python'), 'zod': ('colinhacks/zod', 'TypeScript'),
    'cachetools': ('tkem/cachetools', 'Python'), 'Python-Markdown': ('Python-Markdown/markdown', 'Python'),
    'pyparsing': ('pyparsing/pyparsing', 'Python'), 'marked': ('markedjs/marked', 'TypeScript'),
}
# bug id: (round, project, parent commit, fix commit date, title from the report)
B = {
    'd699': ('easy', 'jsdiff', 'c207c49728038d385f11a61b7c120785074088a1', '2026-08-12', 'diffJson throws on truthy, non-callable toJSON'),
    'd701': ('easy', 'jsdiff', '84726cae21dc16ff02e85d5afd22e94f5a6d1e97', '2026-08-18', 'applyPatch drops a literal carriage return at the end of a file'),
    'd707': ('easy', 'jsdiff', 'b9d516f363785080e5655dc2e50b3e9b0514c219', '2026-09-19', 'diffJson serializes arrays with toJSON wrongly'),
    'h359': ('easy', 'humanize', '984526c02448110a8392dde3f5e26096dfd7c729', '2026-09-16', 'metric() shows one significant figure too many'),
    'i1268': ('easy', 'more-itertools', '1da45ae4b61a832ed080f08a8833784aad0a9534', '2026-09-21', 'seekable(..., maxlen=0): peek() and bool() drop items'),
    'i1304': ('easy', 'more-itertools', '790bb0bb2c03e7a07282e5f16f4b1fde35b8fcf5', '2026-09-29', "ichunked(..., 0) raises islice's ValueError on a nonempty iterable"),
    'm1204': ('easy', 'markdown-it', '5e9b1cc8309d09a9df0f53ae32f811da6ad5c23d', '2026-08-26', 'IPv6 address literal brackets are percent-encoded in link destinations'),
    'p1163': ('easy', 'PapaParse', '4843fc2021bbe04bdc176e71f4c9f8f8388af7bc', '2026-10-08', 'unparse crashes on a null cell when skipEmptyLines is true'),
    'q624': ('easy', 'qs', '5c1d08cd574161b8e5dcf3dd80d9210794fc3f86', '2026-10-17', 'stringify: a lone surrogate swallows the next character'),
    'q629': ('easy', 'qs', '81e7a2251d5a7f4c38e8ea77a31a285ab16d1822', '2026-10-20', "comma: true is ignored with charset 'iso-8859-1' and interpretNumericEntities"),
    't336': ('easy', 'tomlkit', '0518af253901e57872c03835db6fe9bacab40ee7', '2026-10-07', 'Emitting underscores in integers'),
    't599': ('easy', 'tomlkit', '88aa4b1c1128587b8c8ee92d0db11db7bfbdc0ed', '2026-10-12', 'Deleting a slice from an array corrupts the rendered output'),
    't642': ('easy', 'tomlkit', '8c30fc17d91aee7469c0287e509300e78aa15227', '2026-10-12', 'Parse errors report the wrong line and column for CRLF files'),
    'y798': ('easy', 'js-yaml', 'e5a3ba0efee53629b979f784cd53736f89ea61b6', '2026-09-13', 'forceQuotes quotes non-string scalars and emits explicit type tags'),
    'y802': ('easy', 'js-yaml', '30108cc828b5393d55dfbfc8087ab713f7145946', '2026-10-06', 'Block scalar with a whitespace-only body fails'),
    'z6495': ('hard', 'zod', '1a16102a494b03ce1df7b80b663ae2df465f419e', '2026-08-29', 'Functions are executed twice for object property defaults'),
    'z6496': ('hard', 'zod', '7e24a24288183ce02554f1ded7775d0650a7b7e6', '2026-08-29', 'toJSONSchema on record with numeric keys results in invalid propertyNames'),
    'mit': ('hard', 'more-itertools', '30ada7dd597316a3ef967911477e0a1d9f55eefe', '2026-09-02', 'numeric_range: len(), in and index() disagree with the items produced, for float steps'),
    'ct435': ('hard', 'cachetools', '0985ec0d8fefdce90bcbba2dfe88117dad9bb6f6', '2026-10-14', 'cachedmethod class access loses the explicitly supplied instance'),
    'pm1643': ('hard', 'Python-Markdown', '3ade80d7c2cad90c8961c80d9640d80a09afd33f', '2026-10-08', 'HTML comment inside inline raw HTML creates malformed output'),
    'pp653': ('hard', 'pyparsing', '038ff39cbc29b77a74ac21674206d5bf170ca769', '2026-08-17', 'match_previous_expr fails on nested and repeated matches'),
    'mdit1201': ('hard', 'markdown-it', '7b9a6a3a630187e6f9b18fe66b66804bc9ac1122', '2026-08-26', 'Unclosed link/image label suppresses a later inline code span'),
    'jy791': ('hard', 'js-yaml', '04d6fe3298191ee94adf8b1bad87bd2d909092af', '2026-08-19', 'Sequence parsing in version 5 fails (BOM at the start of the file)'),
    'mk4059': ('hard', 'marked', '0653c24b59edfe03e327cbb68ea8318cd0b93641', '2026-08-24', 'Emphasis is lost in the text of a rejected reference link'),
    'mk4051': ('hard', 'marked', '8698d35b84c17f86ea8a299a6183d47ccb3d2bd7', '2026-08-18', 'A link inside link text produces nested links'),
}
MODEL = {'haiku': 'claude-haiku-5-5', 'sonnet': 'claude-sonnet-5-5', 'opus': 'claude-opus-5-5'}

rows = []
for src, rnd in ((EASY, 'easy'), (HARD, 'hard')):
    for r in json.load(open(src)):
        rd, proj, parent, fixdate, title = B[r['bug']]
        assert rd == rnd, r['bug']
        broke = r['broke'] or 0
        rows.append(dict(
            run=r['run'], round=rnd, bug=r['bug'], project=proj, repo='https://github.com/' + P[proj][0], language=P[proj][1],
            parent_commit=parent, fix_date=fixdate, bug_title=title, model=MODEL[r['tool']], rep=r['rep'],
            cases_passed=r['hidden_passed'], cases_total=r['hidden_total'], full_fix=bool(r['full']),
            tests_broken=broke, clean_fix=bool(r['full']) and broke == 0, source_changed=bool(r['src_changed']),
            api_cost_usd=None if r['cost'] is None else round(r['cost'], 5), seconds=r['seconds'], turns=r['turns'],
            permission_denials=r['denials'],
            cases_failed='; '.join(r['hidden_failed']),
            tests_broken_names='; '.join((r.get('broke_names') or (r.get('suite_failed_names') or [] if broke else []))[:20]),
        ))
rows.sort(key=lambda r: (r['round'], r['bug'], r['model'], r['rep']))
meta = dict(
    measured='2026-10-24', runs=len(rows), bugs=len(B), projects=len({b[1] for b in B.values()}),
    setup='Windows 11 laptop; Claude Code 2.1.295 headless (-p), effort medium, --permission-mode acceptEdits, read-only shell commands and the project test runner allowed; no package installs, no network, no web tools',
    scoring=dict(
        easy='Hidden cases written from the maintainers\' tests for the fix (cases_total per bug), run against the run\'s source changes only; tests_broken = newly failing tests in the project\'s own suite (for qs, counted against the fix, which itself changes 2 and 1 old assertions).',
        hard='The maintainers\' test files from the fix commit: target cases = tests that fail before the fix and pass after it; tests_broken = tests in those files that pass both before and after the fix but fail with the run\'s change. Timing tests (quadratic, linear, perf, timing, redos) are not counted as broken.',
        full_fix='every target case passes', clean_fix='full_fix and tests_broken == 0',
        cost='Claude Code\'s own total_cost_usd per run (API prices); runs were made on a subscription'),
)
from math import comb
import random


def fisher(a, b, c, d):
    n = a + b + c + d; r1 = a + b; c1 = a + c
    p0 = comb(r1, a) * comb(n - r1, c1 - a) / comb(n, c1); p = 0
    for x in range(max(0, c1 - (n - r1)), min(r1, c1) + 1):
        px = comb(r1, x) * comb(n - r1, c1 - x) / comb(n, c1)
        if px <= p0 * (1 + 1e-9): p += px
    return min(1, p)


def perm(rs, m1, m2, key, iters=20000):
    """Paired sign-flip permutation test: pairs are (bug, rep); two-sided."""
    pairs = []
    for b in sorted({r['bug'] for r in rs}):
        x = sorted([r for r in rs if r['bug'] == b and r['model'] == m1], key=lambda r: r['rep'])
        y = sorted([r for r in rs if r['bug'] == b and r['model'] == m2], key=lambda r: r['rep'])
        pairs += [(key(a), key(c)) for a, c in zip(x, y)]
    obs = sum(a - c for a, c in pairs); rnd = random.Random(1)
    ge = sum(abs(sum((a - c) if rnd.random() < .5 else (c - a) for a, c in pairs)) >= abs(obs) - 1e-12 for _ in range(iters))
    return round(obs / len(pairs), 4), round(ge / iters, 3)


def boot(rs, a, b, key, iters=10000):
    """95% interval for the difference a - b, resampling bugs (runs of one bug are not independent)."""
    bugs = sorted({r['bug'] for r in rs}); rnd = random.Random(2); out = []
    by = {(g, m): [key(r) for r in rs if r['bug'] == g and r['model'] == m] for g in bugs for m in (a, b)}
    for _ in range(iters):
        s = [rnd.choice(bugs) for _ in bugs]
        xa = [v for g in s for v in by[(g, a)]]; xb = [v for g in s for v in by[(g, b)]]
        out.append(sum(xa) / len(xa) - sum(xb) / len(xb))
    out.sort(); return [round(out[int(iters * .025)], 3), round(out[int(iters * .975)], 3)]


stats = {}
for scope in ('easy', 'hard', 'all'):
    rs = [r for r in rows if scope == 'all' or r['round'] == scope]
    S = {}
    for m in MODEL.values():
        x = [r for r in rs if r['model'] == m]
        S[m] = dict(runs=len(x), cases_passed=sum(r['cases_passed'] for r in x), cases_total=sum(r['cases_total'] for r in x),
                    full_fix=sum(r['full_fix'] for r in x), clean_fix=sum(r['clean_fix'] for r in x),
                    runs_with_broken_tests=sum(r['tests_broken'] > 0 for r in x),
                    mean_cost_usd=round(sum(r['api_cost_usd'] for r in x) / len(x), 4), total_cost_usd=round(sum(r['api_cost_usd'] for r in x), 2),
                    median_seconds=sorted(r['seconds'] for r in x)[len(x) // 2] if len(x) % 2 else sum(sorted(r['seconds'] for r in x)[len(x) // 2 - 1:len(x) // 2 + 1]) / 2)
    T = {}
    for a, b in (('claude-haiku-5-5', 'claude-opus-5-5'), ('claude-haiku-5-5', 'claude-sonnet-5-5'), ('claude-sonnet-5-5', 'claude-opus-5-5')):
        A, Bm = S[a], S[b]
        T[f'{a} vs {b}'] = dict(
            fisher_full_fix_p=round(fisher(A['full_fix'], A['runs'] - A['full_fix'], Bm['full_fix'], Bm['runs'] - Bm['full_fix']), 3),
            fisher_clean_fix_p=round(fisher(A['clean_fix'], A['runs'] - A['clean_fix'], Bm['clean_fix'], Bm['runs'] - Bm['clean_fix']), 3),
            paired_case_share_diff=perm(rs, a, b, lambda r: r['cases_passed'] / r['cases_total'])[0],
            paired_case_share_p=perm(rs, a, b, lambda r: r['cases_passed'] / r['cases_total'])[1],
            paired_clean_diff=perm(rs, a, b, lambda r: int(r['clean_fix']))[0],
            paired_clean_p=perm(rs, a, b, lambda r: int(r['clean_fix']))[1],
            clean_rate_diff_ci95_bug_bootstrap=boot(rs, a, b, lambda r: int(r['clean_fix'])),
            case_share_diff_ci95_bug_bootstrap=boot(rs, a, b, lambda r: r['cases_passed'] / r['cases_total']))
    stats[scope] = dict(models=S, tests=T)
meta['stats'] = stats
open(os.path.join(OUT, 'claude-haiku-vs-opus-real-bugs.json'), 'w', encoding='utf-8').write(json.dumps(dict(meta, bugs={k: dict(zip(['round', 'project', 'parent_commit', 'fix_date', 'title'], v)) for k, v in B.items()}, runs=rows), ensure_ascii=False, indent=1))
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
open(os.path.join(OUT, 'claude-haiku-vs-opus-real-bugs.csv'), 'w', encoding='utf-8', newline='').write(buf.getvalue())
print(len(rows), 'runs written')
