# Pre-registration: which model does Claude Code's Explore subagent run on, version by version?

Written 2026-11-07, before any scored run. Pilots (8 runs on M1, listed below) are excluded from the data.

## Why

A widely shared post from February 2026 said Claude Code's built-in Explore subagent is hard-coded to Haiku. In our dataset 27 (Claude Code 2.1.318), every Explore call ran on the main model, so on Opus the subagent ran at Opus prices. Pilots on 2026-11-07 with main model claude-opus-4-5: 2.1.50 and 2.1.150 ran Explore on claude-haiku-4-5; 2.1.250 and 2.1.295 ran it on claude-opus-4-5. With claude-opus-5-5, 2.1.295 and 2.1.318 ran it on claude-opus-5-5 (Opus 5.5 is refused below 2.1.280).

## Questions

1. Part A: in which Claude Code version did Explore stop running on Haiku and start running on the main model? What happened to cost per run and to the number of `result` events (background subagents) across versions?
2. Part B: on 2.1.318 with Opus 5.5, does `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5` move Explore to Haiku, and what does it do to cost and to the share of right answers found?

## Setup

- Prompt: a dataset 27 question plus "Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself." Questions, answer key and repos at fixed commits are dataset 27's (questions.json sha256 `4657429a357de492468c137da0fe3c95daac2e79cf99b8e2ac5377e43e5246ec`), scored with dataset 27's scorer as amended (all `result` events joined).
- Headless `claude -p`, stream-json, read and search tools only, no MCP servers, Windows 11, a separate config directory, 2 runs at a time, order shuffled (seed 28).
- Part A: 18 versions (2.1.0, 2.1.25, 2.1.50, 2.1.75, 2.1.100, 2.1.126, 2.1.150, 2.1.175, 2.1.200, 2.1.225, 2.1.250, 2.1.275, 2.1.290, 2.1.295, 2.1.300, 2.1.305, 2.1.310, 2.1.318), main model claude-opus-4-5 (the newest Opus that every version accepts), questions M1 and U1, 2 runs each: 72 runs. If the switch falls between two tested versions, the versions in between are installed from npm and run the same way (added runs reported as such).
- Part B: 2.1.318, main model claude-opus-5-5, 12 questions, `CLAUDE_CODE_SUBAGENT_MODEL` unset vs `claude-haiku-5-5`, 3 runs each: 72 runs.
- jobs.csv sha256: `468ba0688a54f446cec85e69bc59cf278e69b54f4febf3cb98be492418f614c8`

## Outcomes

- Subagent model: the `model` of assistant messages with a `parent_tool_use_id`, and the per-model split of `modelUsage`.
- Background: `subagent_stats.started_in_background` where present, and the number of `result` events.
- Cost: last `result` event's `total_cost_usd`; recall as in dataset 27.

## Analysis

- Part A is descriptive: the first tested version where Explore ran on the main model in both runs of both questions, and the cost per run before and after.
- Part B: recall difference (mean per question, haiku minus inherit). A difference of 15 points or more counts as an effect, as in dataset 27. Cost is reported as percent change.

## Limits

Part A uses Opus 4.5, not the current Opus, so dollar figures are for that model. Two questions and 2 runs per version show which model ran, not quality. One machine, one account.

## Amendment 1 (2026-11-08, after the first 144 runs)

What was seen: Part A switched between 2.1.175 (Explore on claude-haiku-4-5 in all 4 runs) and 2.1.200 (on the main model in all 4 runs). In Part B, `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5` left Explore on claude-opus-5-5 in all 24 completed runs. 21 Part B runs failed instantly on the subscription's 5-hour limit and gave no answer.

Added before running them:
1. The 21 failed Part B runs are re-run unchanged. Failed attempts are kept in `runs_limit/` and not scored.
2. Bisection between 2.1.175 and 2.1.200 over the 18 npm versions in between (2.1.176 ... 2.1.199): each probe is one M1 run with claude-opus-4-5; a probe is "Haiku" if `modelUsage` has a Haiku entry. The two versions on either side of the switch then get the full Part A set (M1 and U1, 2 runs each).
3. Part C (pilot, descriptive): 2.1.318, claude-opus-5-5, M1, 2 runs each with (a) `CLAUDE_CODE_SUBAGENT_MODEL=haiku`, (b) `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5` plus `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, (c) `haiku` plus `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`. Outcome: which model Explore ran on, cost. If one setting moves Explore to Haiku, it gets the full Part B set (12 questions, 3 runs) as Part D, reported as added after the fact.
