# Which model does Claude Code's Explore subagent run on? 205 runs across 26 versions

A widely shared post from February 2026 said Claude Code's built-in Explore subagent is hard-coded to Haiku. It was, until 2.1.197. This dataset pins down when that changed, what it costs, and the setting that brings Haiku back.

## Findings

- **The switch: 2.1.198.** With the main model fixed to Opus 4.5, Explore ran on Haiku 4.5 in every run from 2.1.0 to 2.1.197, and on the main model (Opus 4.5) in every run from 2.1.198 to 2.1.318. The two boundary versions got 4 full runs each plus a bisection probe.
- **It doubled the cost of a delegated search.** Same prompt, same questions, main model Opus 4.5: $0.18 per run while Explore was Haiku, $0.37 after (+105%). Share of right answers found: 89% before, 94% after (2 questions, 4 runs per version, so read this as a small gap).
- **`CLAUDE_CODE_SUBAGENT_MODEL` alone does not move Explore.** On 2.1.318 with Opus 5.5, setting it to `claude-haiku-5-5` left Explore on Opus 5.5 in all 36 runs (found 99% vs 100%, cost $0.37 vs $0.38).
- **Adding `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` does.** With `CLAUDE_CODE_SUBAGENT_MODEL=haiku` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, Explore ran on Haiku 5.5 in all 36 runs. Found: 100% vs 100% with the default, on the same 12 questions × 3 runs. Cost per run: $0.38 → $0.15 (−60%).
- Opus 5.5 is refused by the API below Claude Code 2.1.280, so the version history uses Opus 4.5 as the main model.

## Files

- `claude-subagent-model-by-version.csv`: one row per run (part, Claude Code version, main model, question, rep, environment setting, Explore model, Haiku and main-model cost split, total API cost, recall, result events, background start, seconds, turns).
- `claude-subagent-model-by-version.json`: the runs plus a summary (switch versions, per-version cost and model, the three 2.1.318 settings, bootstrap interval).
- `answers.jsonl`: the text of every `result` event of every run.
- `claude-subagent-model-by-version-chart.png`
- `PREREG.md` (two dated amendments), `jobs.csv`, `run_ds28.ps1`, `scripts/`.

## Method

- Prompt: a question from [dataset 27](../claude-subagent-effort) plus "Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself." Same repos, commits, answer key and scorer as dataset 27.
- Headless `claude -p`, stream-json, read and search tools only, no MCP servers, Windows 11, a separate config directory.
- Part A: 18 versions (2.1.0 ... 2.1.318) × 2 questions × 2 runs with Opus 4.5, then a bisection over the npm versions 2.1.176 ... 2.1.199 and full sets at 2.1.176, 2.1.197 and 2.1.198. Part B: 2.1.318 + Opus 5.5, default vs `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5`, 12 questions × 3 runs. Part C: a 6-run pilot of three settings. Part D: the FORCE setting on the Part B set.
- The Explore model is read from the assistant messages that carry a `parent_tool_use_id`, and checked against the per-model split in `modelUsage`.

## Incidents

- 21 Part B runs hit the subscription's 5-hour limit and were re-run; failed attempts are not scored.
- The first bisection used a regex that never matched a Haiku entry and wrongly put the switch at 2.1.176. The raw logs showed Haiku through 2.1.186; the bisection was re-run with parsed JSON (amendment 2). The wrong-step probes are kept as data.

## Limitations

Two questions per version in Part A; the version history says which model ran, not how good it was. One machine, one account, one prompt. The FORCE setting is undocumented as far as we found and may change.

License: CC BY 4.0. Cite: TokenSave (2026). Which model does Claude Code's Explore subagent run on? 205 runs across 26 versions [Data set]. https://github.com/johnisking/token-cost-by-language/tree/main/claude-subagent-model-by-version
