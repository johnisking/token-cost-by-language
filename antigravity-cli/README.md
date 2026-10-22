# Antigravity CLI vs Claude Code vs Codex: startup tokens, MCP tools and the same coding task

DOI: https://doi.org/10.5281/zenodo.23569397

Measured 2026-10-22 on Windows 11 with Claude Code 2.1.295 (Opus 5.5), Codex CLI 0.162.0-alpha.17.2 (gpt-6-luna) and Google's Antigravity CLI 1.4.5 (`agy`) with Gemini 4 Argon and with Claude Opus 5.5. 44 runs. License: CC BY 4.0.

Page with tables, chart and method: https://tokensave.app/data/antigravity-cli-vs-claude-code-vs-codex

## Key numbers

- Startup ("Reply with the single word OK.", no MCP): Claude Code 35,781 input tokens, Codex 14,818, Antigravity + Gemini 4 Argon 6,745, Antigravity + Opus 5.5 5,326 (+5,167 cache reads reported separately).
- Same brick-breaker game task, average of 3 runs: Claude Code + Opus 5.5 78,671 input / 7,313 output / 58 s; Codex 55,680 / 4,563 / 68 s; Antigravity + Gemini 13,041 (+6,796 cache) / 6,373 / 81 s; Antigravity + Opus 5.5 9,822 (+15,381 cache) / 4,378 / 42 s.
- Same model, Opus 5.5: 68% to 88% fewer input tokens in Antigravity than in Claude Code (high end counts only reported input, low end adds the separately reported cache reads).
- 30 dummy MCP tools added +388 tokens (Claude Code), +0 (Codex), +582 (Antigravity + Gemini), +417 (Antigravity + Opus).
- All 12 games worked in a headless-browser check (score, level 2, lives 3-2-1-0). The automatic check could not read the score in two Codex games; manual checks confirmed scoring (see `check_note`).

## How to read Antigravity's numbers

`agy --output-format json` reports input_tokens, output_tokens, thinking_tokens, cache_read_tokens and total_tokens (= input + output). Whether cache reads are part of input is undocumented; in the Opus runs cache reads exceed input, so they are not contained there. Treat input + cache_read as an upper bound.

## Files

- `antigravity-cli-vs-claude-code-vs-codex.csv`: one row per run (tool, test, MCP tools, run, reported input, cache reads, output, seconds, API cost for Claude Code, file lines, game checks).
- `antigravity-cli-vs-claude-code-vs-codex.json`: the same with setup and notes.
- `antigravity-cli-vs-claude-code-vs-codex-chart.png`
- `runs/`: raw JSON output of every run and every generated game (`index.html`); the Windows user name is masked as USER.
- `scripts/`: `run_three.ps1` (runner), `mcp_dummy.js` (MCP test server), `check_brick_deep.py` (game checker), `l2.js` / `lives_test.js` (manual lives checks).
- `check_brick_deep.json`: checker output.

Earlier Claude Code vs Codex dataset: https://tokensave.app/data/claude-code-vs-codex-tokens

Cite: TokenSave (2026). Antigravity CLI vs Claude Code vs Codex: startup tokens, MCP tools and the same coding task [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23569397
