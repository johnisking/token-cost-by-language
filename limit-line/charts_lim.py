"""Chart for /data/ai-coding-limit-line (run from _source/): hidden test cases passed per run on the hard marked bug,
by model and by whether the agent could run tests. Runs that broke other spec tests are drawn hollow in red."""
import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
BG = '#0f0f12'; FG = '#e4e4e7'; MUTED = '#a1a1aa'; GRID = '#27272a'
COL = {'haiku': '#a78bfa', 'sonnet': '#60a5fa', 'opus': '#f59e0b', 'codex': '#34d399', 'gemini': '#f472b6'}
D = json.load(open('blog_data/limitline/dataset/ai-coding-limit-line.json', encoding='utf-8'))
R = [r for r in D['runs'] if not r['excluded'] and r['task'] == '6t3']
groups = [('haiku', False, 'Haiku 5.5 · no tests'), ('haiku', True, 'Haiku 5.5 · tests allowed'),
          ('sonnet', False, 'Sonnet 5.5 · no tests'), ('sonnet', True, 'Sonnet 5.5 · tests allowed'),
          ('opus', False, 'Opus 5.5 · no tests'), ('opus', True, 'Opus 5.5 · tests allowed'),
          ('codex', False, 'Codex gpt-6-luna · no tests'), ('gemini', False, 'Gemini 4 Argon · no tests')]
spec = [r for r in D['runs'] if not r['excluded'] and r['task'] in ('2', '3', '4', '5a', '5b')]
fig, ax = plt.subplots(figsize=(12, 6.6), dpi=100); fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
for i, (t, ta, lab) in enumerate(groups):
    rs = [r for r in R if r['tool'] == t and bool(r.get('tests_allowed')) == ta]
    by = {}
    for r in rs: by.setdefault(r['hidden_cases_passed'] or 0, []).append(r)
    for v, lst in by.items():
        for k, r in enumerate(lst):
            x = v + (k - (len(lst) - 1) / 2) * 0.13
            broke = (r.get('new_test_failures') or 0) > 0
            ax.scatter([x], [i], s=150, zorder=3, facecolors='none' if broke else COL[t],
                       edgecolors='#ef4444' if broke else COL[t], linewidths=2.2 if broke else 0)
    ax.text(7.55, i, f'{len(rs)} runs', va='center', color=MUTED, fontsize=9)
ax.annotate('marked no longer loads', xy=(0.12, 4), xytext=(0.35, 3.55), color='#ef4444', fontsize=8.5)
ax.axvline(3, color=MUTED, lw=1, ls=':', zorder=1)
ax.text(3.05, -0.75, 'unfixed code passes 3', color=MUTED, fontsize=8.5)
ax.axvline(7, color='#16a34a', lw=1.2, ls='--', zorder=1)
ax.text(6.95, -0.75, 'fixed = 7', color='#16a34a', fontsize=8.5, ha='right')
ax.set_xlim(-0.4, 8.2); ax.set_ylim(len(groups) - 0.5, -1.1)
ax.set_xticks(range(8)); ax.set_xticklabels([str(x) for x in range(8)], color=FG, fontsize=10)
ax.set_yticks(range(len(groups))); ax.set_yticklabels([g[2] for g in groups], color=FG, fontsize=10)
for y in range(len(groups)): ax.axhline(y, color=GRID, lw=0.6, zorder=0)
ax.tick_params(length=0)
for s in ax.spines.values(): s.set_visible(False)
ax.set_xlabel('Cases of the maintainers’ test passed (of 7)', color=MUTED, fontsize=9.5)
fig.text(0.02, 0.955, 'Where Claude Haiku falls behind Opus', fontsize=17, fontweight='bold', color=FG)
fig.text(0.02, 0.915, f"A real bug in the marked parser, one dot per run · hollow red = broke other spec tests · {len(D['runs']) - sum(r['excluded'] for r in D['runs'])} runs in the dataset · tokensave.app/data · CC BY 4.0",
         fontsize=9.5, color=MUTED)
fig.text(0.02, 0.03, 'On levels 2 to 5 (apps from a spec, a 1,032-line app with six symptom-only bugs, a spreadsheet engine) Haiku, Sonnet and Opus '
         'got full marks on all 21 runs each.\nThe cases nobody fixed are code spans that contain a backtick, which the bug report did not mention.',
         fontsize=8.5, color=MUTED)
plt.subplots_adjust(left=0.2, right=0.97, top=0.84, bottom=0.17)
plt.savefig('src/static/ai-coding-limit-line-chart.png', facecolor=BG); plt.close(fig)
print('ok')
