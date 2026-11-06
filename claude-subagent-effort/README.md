# Subagent effort in Claude Code: 288 runs on 12 code-search questions

Claude Code 2.1.318 added a subagent effort setting (`CLAUDE_CODE_SUBAGENT_EFFORT`). Does telling Claude Code to search with subagents, at low, medium or high subagent effort, find more of the answer? 288 pre-registered headless runs: Claude Haiku 5.5 and Opus 5.5, four conditions, 12 "find every place" questions in 6 open-source repos, 3 runs each.

## Findings

- **Subagents found nothing more.** Share of the right answers found (mean per question), no instruction / subagents at effort low / medium / high: Haiku 98% / 97% / 98% / 99%; Opus 100% / 99% / 99% / 100%. No difference reached 2 points (pre-registered threshold: 15 points).
- **They cost more.** Mean API cost per run: Haiku $0.0056 / $0.0098 / $0.0105 / $0.0121 (+74%, +87%, +116%); Opus $0.159 / $0.386 / $0.509 / $0.483 (+143%, +221%, +204%). Median time per run went from 18 to 37-48 seconds (Haiku) and 22 to 47-60 seconds (Opus).
- **Subagents ran on the main model.** Every Explore subagent call ran on the same model as the main agent: Haiku called Haiku, Opus called Opus.
- **Nobody used subagents unasked.** With no instruction, 0 of 72 runs called a subagent (and 0 of 504 runs in the previous dataset).
- **Headless runs answer late.** In 2.1.318 the Explore agent runs in the background, so a headless run emits several `result` events: first "the agent is still searching", then the answer, sometimes a final "stopped the autonomous loop" note. In 210 of 216 subagent runs the first `result` held no answer. Scored on the first `result` only, the subagent conditions found 0-9% of the answers. 4 Haiku runs answered and then never exited (20-minute timeout).

## Files

- `claude-subagent-effort.csv`: one row per run (model, condition, subagent effort, question, repo, commit, rep, key items, recall under three readings, result events, timeout, subagent calls and models, API cost, seconds, turns, output tokens).
- `claude-subagent-effort.json`: the same runs plus questions and per-cell summary (question-level bootstrap interval vs no instruction, cost change).
- `answers.jsonl`: the text of every `result` event of every run, for re-scoring.
- `claude-subagent-effort-chart.png`: recall and cost change by condition and model.
- `PREREG.md`, `questions.json`, `keys/`: the pre-registration and answer key, frozen before the first run (sha256 in PREREG.md), with two amendments.
- `scoring/`, `prompts/`, `jobs.csv`, `run_ds27.ps1`: the scorer, the prompts and the runner.

## Method

- Conditions: C0 the question only; C1-C3 the question plus "Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself.", with `CLAUDE_CODE_SUBAGENT_EFFORT` set to low, medium or high.
- Agent: Claude Code 2.1.318 on Windows 11, headless (`-p`), read and search tools only (Edit, Write, Bash, WebFetch, WebSearch disallowed), no MCP servers, default effort for the main agent. Repos: undici, fastify, cachetools, Python-Markdown, anyio, zod, each a clean git worktree at a fixed commit.
- Answer key: a regex over the repo source, then the enclosing function, method or class from a parser. 151 items, 3 to 28 per question.
- Scoring: an item counts when the answer names its file and its function or class (rules in `scoring/score.py`). Recall is averaged per question, then across the 12 questions.

## Amendments and incidents

- Amendment 1 (after 2 runs): a method named once above a table was not matched per row; the `Class.method` rule was loosened.
- Amendment 2 (after the condition table had been seen): the original rule scored only the last `result` event. That gives Haiku 98 / 78 / 97 / 88 and Opus 100 / 99 / 99 / 100, because some runs end with an "autonomous loop" note after the answer. The published scoring joins all `result` events. Both readings are in the CSV.
- 40 runs hit the subscription's 5-hour usage limit and then a login expiry. They produced no answer and were re-run after a fresh login; the failed attempts are not scored.

## Limitations

12 questions, all with one right list, and both models were near the ceiling with no instruction, so a gain had little room. Searches this size do not need parallel subagents; a larger monorepo might. One prompt wording, one Claude Code version.

Previous dataset: [claude-report-edge-cases](../claude-report-edge-cases)

License: CC BY 4.0. Cite: TokenSave (2026). Subagent effort in Claude Code: 288 runs on 12 code-search questions [Data set]. https://github.com/johnisking/token-cost-by-language/tree/main/claude-subagent-effort
