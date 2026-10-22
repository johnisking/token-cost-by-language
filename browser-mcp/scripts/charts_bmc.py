import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt, matplotlib.ticker
BG='#0f0f12'; FG='#e4e4e7'; MUTED='#a1a1aa'; GRID='#27272a'
d = json.load(open('blog_data/mcpdiet/combined.json', encoding='utf-8'))
F = d["full_snapshot_claude_tokens"]
def added(srv, mode, task):
    v = [s["tokens_added_next_request"] for r in d["rows"] if r["srv"] == srv and r["mode"].startswith(mode) and r["task"] == task for s in r["snapshots"]]
    return v[0]
panels = [
  ("A long Wikipedia article: one full snapshot", [
     ("Playwright MCP", F["playwright_mcp_0.0.83"], added("pw", "tokensave-mcp-diet 0.2", "probe")),
     ("Chrome DevTools MCP", F["chrome_devtools_mcp_1.11.0"], added("cdt", "tokensave-mcp-diet 0.2", "probe"))]),
  ("Hacker News front page: one snapshot", [
     ("Playwright MCP", added("pw", "as", "hnsnap"), added("pw", "tokensave-mcp-diet 0.2", "hnsnap")),
     ("Chrome DevTools MCP", added("cdt", "as", "hnsnap"), added("cdt", "tokensave-mcp-diet 0.2", "hnsnap"))]),
]
fig, axes = plt.subplots(1, 2, figsize=(12, 5.6), dpi=100); fig.patch.set_facecolor(BG)
for ax, (title, items) in zip(axes, panels):
    ax.set_facecolor(BG)
    top = max(max(a, b) for _, a, b in items)
    y = 0; ticks = []; labels = []
    for name, raw, diet in items:
        ax.barh(y, raw, color=MUTED, height=0.36); ax.text(raw + top*0.02, y, f"{raw:,}  as shipped", va='center', color=FG, fontsize=10.5)
        ax.barh(y + 0.4, diet, color="#34d399", height=0.36)
        ax.text(diet + top*0.02, y + 0.4, f"{diet:,}  with tokensave-mcp-diet 0.2 (−{round((1 - diet/raw)*100)}%)", va='center', color=FG, fontsize=10.5)
        ticks.append(y + 0.2); labels.append(name); y += 1.2
    ax.set_yticks(ticks); ax.set_yticklabels(labels); ax.invert_yaxis()
    ax.set_xlim(0, top * 1.9)
    ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(4))
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{int(v):,}"))
    ax.set_title(title, color=FG, fontsize=12.5, loc='left')
    ax.tick_params(axis='x', colors=MUTED); ax.tick_params(axis='y', colors=FG, labelsize=10.5, length=0)
    for s in ax.spines.values(): s.set_visible(False)
    ax.grid(axis='x', color=GRID); ax.set_axisbelow(True)
fig.text(0.02, 0.95, "Claude tokens one browser-MCP page snapshot adds to the context", fontsize=17, fontweight='bold', color=FG)
fig.text(0.02, 0.905, "Claude Code 2.1.295 · Opus 5.5 · Playwright MCP 0.0.83, Chrome DevTools MCP 1.11.0 · measured 2026-10-22 · tokensave.app/data · CC BY 4.0", fontsize=9.5, color=MUTED)
fig.text(0.02, 0.87, "Wikipedia 'as shipped' counted by sending the snapshot text to Opus 5.5 (Claude Code itself refuses a tool result this large)", fontsize=9.5, color=MUTED)
plt.subplots_adjust(left=0.165, right=0.98, top=0.77, bottom=0.08, wspace=0.55)
plt.savefig('src/static/browser-mcp-token-cost-chart.png', facecolor=BG); plt.close(fig)
