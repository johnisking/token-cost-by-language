# Edge-case prompts and effort in Claude Code: 504 runs on 21 real bugs

Can a prompt or a higher effort setting make Claude Code handle the cases a bug report leaves out? 504 pre-registered Claude Code runs on 21 real bugs fixed between August and October 2026 in 12 open-source projects: Claude Haiku 5.5 and Opus 5.5, four conditions, 3 runs each. Every run is scored by the maintainers' own tests for the fix, split into cases the report shows and cases it leaves out.

Page with tables and method: https://tokensave.app/data/claude-edge-case-prompts

## Findings

- **The prompt and effort did not help.** Share of unreported maintainer test cases passed (mean per bug), baseline / effort high / edge-case prompt / edge-case prompt + read tests: Haiku 84% / 82% / 84% / 86%; Opus 88% / 86% / 91% / 84%. No condition moved it by more than 4 points (pre-registered threshold: 20 points with a bug-level bootstrap interval excluding 0).
- **They cost more.** Mean API cost per run: Haiku $0.050 / $0.081 / $0.10 / $0.12 (+60%, +108%, +134%); Opus $0.51 / $0.62 / $0.82 / $0.81 (+22%, +60%, +58%). Median time per run more than doubled with the edge-case prompt.
- **Clean fixes barely moved** (of 63 per cell): Haiku 34, 33, 36, 37; Opus 38, 38, 39, 37.
- **Haiku vs Opus:** $0.088 vs $0.69 per run (about 87% less), 140 vs 152 clean fixes over 252 runs each. Opus broke other tests in fewer runs.
- **The bug decided the result.** On 12 of 21 bugs both models passed every unreported case in every condition. On a js-yaml bug (a BOM before every document in a stream) no run passed the unreported case.

## Files

- `claude-edge-case-prompts.csv`: one row per run (model, condition, bug, group, project, repo, parent and fix commit, rep, reported and unreported cases passed, unreported targets, other tests broken, clean fix, API cost, seconds, API seconds, turns, output tokens).
- `claude-edge-case-prompts.json`: the same runs plus bug list, conditions, per-bug results and statistics (bug-level bootstrap intervals vs baseline, cost change).
- `claude-edge-case-prompts-chart.png`: pass rate and cost per run by condition and model.
- `PREREG.md`, `labels.json`, `prompts_ds26.json`, `checks/`: the pre-registration, frozen before any run (sha256 in PREREG.md).
- `scoring/`: the scorer, worktree map, baseline (5 repeats at parent and fix) and raw scores. `scoring/SETUP.md` explains how to rebuild the scoring setup.

## Method

- Conditions: baseline (symptom-only report, effort medium); effort high; edge-case prompt ("Before changing code, list the inputs and variants this report does not mention but the fix must also handle. Write tests for them first, then fix."); edge-case prompt + "Read the existing tests for the code you change before you start."
- Agent: Claude Code 2.1.295 on Windows 11, headless (`-p`), acceptEdits; the project's tests allowed; no installs, no network.
- Scoring: only the run's changes to library source were kept. The maintainers' tests for the fix were run 5 times at the parent and the fix; unstable tests were dropped. Unreported cases include cases that already pass before the fix (guards), which a careless fix can break.

## Limitations

21 bugs, 3 runs per cell: a 20-point effect is ruled out, a few points is not. One prompt wording per condition. 12 of 21 bugs were at the ceiling for both models. anyio bugs were scored on Windows, the rest on Linux. The scoring setup was rebuilt after a workspace reset; re-scoring 228 Haiku runs scored before the reset gave identical numbers.

Previous dataset: [claude-real-bugs](../claude-real-bugs)

License: CC BY 4.0. Cite: TokenSave (2026). Raising effort didn't catch more edge cases, and Haiku got nearly the same result for 87% less: 504 Claude Code runs on 21 real bugs [Data set]. https://tokensave.app/data/claude-edge-case-prompts
