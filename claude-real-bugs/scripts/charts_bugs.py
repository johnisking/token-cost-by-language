"""Chart for /data/claude-haiku-vs-opus-real-bugs (run from _source/): one square per run, 25 real bugs x 3 Claude models x 3 runs.
Green = every target case passed and nothing else broke; amber = every case passed but other tests broke; grey shade = share of cases passed."""
import json, statistics, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
BG = '#0f0f12'; FG = '#e4e4e7'; MUTED = '#a1a1aa'; GRID = '#27272a'
GREEN = '#22c55e'; AMBER = '#f59e0b'; RED = '#ef4444'
D = json.load(open('blog_data/claudebugs/dataset/claude-haiku-vs-opus-real-bugs.json', encoding='utf-8'))
R = D['runs']; M = [('claude-haiku-5-5', 'Haiku 5.5'), ('claude-sonnet-5-5', 'Sonnet 5.5'), ('claude-opus-5-5', 'Opus 5.5')]
bugs = []
for rnd in ('easy', 'hard'):
    bugs += sorted({(r['project'], r['bug']) for r in R if r['round'] == rnd})
fig, ax = plt.subplots(figsize=(12, 12.5), dpi=100); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
cw, gap = 0.27, 0.6  # square width, gap between model blocks
def color(r):
    if r['clean_fix']: return GREEN, None
    if r['full_fix']: return AMBER, None
    share = r['cases_passed'] / r['cases_total']
    g = 0.18 + 0.42 * share
    return (g, g, g + 0.03), (RED if r['tests_broken'] else None)
y = 0; yt = []; split = None
for i, (proj, b) in enumerate(bugs):
    if split is None and D['bugs'][b]['round'] == 'hard':
        split = y; y += 1.2
    for j, (m, _) in enumerate(M):
        rs = sorted([r for r in R if r['bug'] == b and r['model'] == m], key=lambda r: r['rep'])
        for k, r in enumerate(rs):
            x = j * (3 * cw + gap) + k * cw
            fc, ec = color(r)
            ax.add_patch(Rectangle((x, y - 0.38), cw * 0.86, 0.76, facecolor=fc, edgecolor=ec or fc, linewidth=1.8 if ec else 0))
    yt.append((y, f'{proj} · {D["bugs"][b]["title"][:44]}{"…" if len(D["bugs"][b]["title"]) > 44 else ""}'))
    y += 1
ax.set_yticks([a for a, _ in yt]); ax.set_yticklabels([b for _, b in yt], color=FG, fontsize=8.6)
xs = [j * (3 * cw + gap) + 1.5 * cw - cw * 0.07 for j in range(3)]
ax.set_xticks(xs); ax.set_xticklabels([l for _, l in M], color=FG, fontsize=11, fontweight='bold'); ax.xaxis.tick_top()
ax.set_xlim(-0.1, 3 * (3 * cw + gap) - gap + 2.0); ax.set_ylim(y - 0.4, -1.3)
ax.text(-0.15, -0.95, 'EASY ROUND · 15 bugs, cause and symptom close together', color=MUTED, fontsize=9, fontweight='bold', ha='right', va='center', clip_on=False)
ax.axhline(split + 0.3, color=GRID, lw=1)
ax.text(-0.15, split + 0.62, 'HARD ROUND · 10 bugs, symptom-only reports', color=MUTED, fontsize=9, fontweight='bold', ha='right', va='center', clip_on=False)
# right column: per-model totals at the bottom
tot_x = 3 * (3 * cw + gap) - gap + 0.15
for rnd, yy in (('easy', split / 2 - 0.5), ('hard', split + 0.9 + (y - split - 0.9) / 2 - 1.2)):
    lines = []
    for m, lab in M:
        rs = [r for r in R if r['round'] == rnd and r['model'] == m]
        lines.append(f"{lab.split()[0]}: {sum(r['clean_fix'] for r in rs)}/{len(rs)} clean · ${statistics.mean(r['api_cost_usd'] for r in rs):.3f}/run")
    ax.text(tot_x, yy, '\n'.join(lines), color=FG, fontsize=8.8, va='center', linespacing=1.7)
ax.tick_params(length=0)
for s in ax.spines.values(): s.set_visible(False)
fig.text(0.02, 0.968, 'Claude Haiku vs Sonnet vs Opus on 25 real bugs', fontsize=18, fontweight='bold', color=FG)
fig.text(0.02, 0.948, f"One square per run · {len(R)} Claude Code runs, 3 per bug and model · tokensave.app/data · CC BY 4.0", fontsize=9.5, color=MUTED)
lx = 0.02; ly = 0.022
for fc, ec, lab in ((GREEN, None, 'fixed, nothing else broken'), (AMBER, None, 'fixed, but broke other tests'),
                    ((0.39, 0.39, 0.42), None, 'partly fixed (lighter = more cases)'), ((0.39, 0.39, 0.42), RED, 'partly fixed and broke tests')):
    fig.patches.append(Rectangle((lx, ly), 0.014, 0.012, transform=fig.transFigure, facecolor=fc, edgecolor=ec or fc, linewidth=1.6 if ec else 0))
    fig.text(lx + 0.019, ly + 0.002, lab, color=MUTED, fontsize=9); lx += 0.235
plt.subplots_adjust(left=0.37, right=0.99, top=0.9, bottom=0.06)
plt.savefig('src/static/claude-haiku-vs-opus-real-bugs-chart.png', facecolor=BG); plt.close(fig)
print('ok')
