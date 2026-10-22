# Browser MCP token cost: Playwright MCP vs Chrome DevTools MCP, and a snapshot diet

Measured 2026-10-22 with Claude Code 2.1.295 (Opus 5.5, effort medium) on Windows 11. 94 runs, 7 tasks. License: CC BY 4.0.

Page with tables, chart and method: https://tokensave.app/data/browser-mcp-token-cost
Tool used in the "diet" runs: https://github.com/johnisking/tokensave-mcp-diet (MIT)

## Key numbers

- Everyday tasks (TodoMVC, Wikipedia facts, Hacker News, a Wikipedia table): 90,000 to 224,000 input tokens per task, $0.16 to $0.22; the largest single tool result in 16 runs was 6,012 characters.
- One full accessibility snapshot of the English Wikipedia article "Python (programming language)": 504,168 characters / 205,642 Claude tokens (Playwright MCP 0.0.83) and 427,400 / 208,926 (Chrome DevTools MCP 1.11.0). Claude Code refused both as too large.
- Hacker News snapshot, tokens added to the next request: 18,407 → 6,770 (Playwright) and 14,115 → 8,047 (Chrome DevTools) with tokensave-mcp-diet 0.2; task cost −30% and −17% (5 runs each).
- Wikipedia fact task from a snapshot: −4% (Playwright) and −23% (Chrome DevTools) with 0.2; version 0.1 had cost 3% to 44% more on Wikipedia tasks.

## Files

- `browser-mcp-token-cost.csv`: one row per run (server, mode, task, run, input/output tokens, API cost, requests, seconds, largest tool result, snapshot sizes, whether Claude Code refused the snapshot, answered).
- `browser-mcp-token-cost.json`: the same plus every snapshot call and the Claude token count of the full Wikipedia snapshots.
- `browser-mcp-token-cost-chart.png`
- `logs/`: Claude Code stream-json log of every run (`<server>_<task>_r<n>` = as shipped, first set; `<server>_base|v2|v3_<task>_r<n>` = as shipped / diet 0.1.0 / diet 0.2.0). The PC user name is replaced with USER.
- `scripts/`: PowerShell run scripts, the token-count script and the Python that builds the CSV/JSON and chart.

Full page snapshots of Wikipedia and Hacker News are not included (third-party content); their sizes and token counts are in the JSON.

Cite: TokenSave (2026). Browser MCP token cost: Playwright MCP vs Chrome DevTools MCP, and what a snapshot diet saves [Data set]. https://tokensave.app/data/browser-mcp-token-cost
