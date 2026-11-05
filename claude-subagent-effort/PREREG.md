# Pre-registration: does subagent effort change what Claude Code finds?

Written 2026-11-06, before any scored run. Pilot runs (4, on two other questions) are excluded.

## Question

Claude Code 2.1.318 adds a subagent effort setting (`CLAUDE_CODE_SUBAGENT_EFFORT`, settings key `subagentEffort`).
When the main agent is told to use subagents for a code search, does raising subagent effort find more of the answer, and what does it cost?

## Setup

- Claude Code 2.1.318, headless (`claude -p`), stream-json output, Windows 11.
- Tools: read and search only. Edit, Write, Bash, WebFetch and WebSearch are disallowed. No MCP servers.
- Models for the main agent: Haiku 5.5 and Opus 5.5, at default effort.
- 12 search questions, 2 each in 6 open-source repos at fixed commits (in `questions.json`): undici, fastify, cachetools, Python-Markdown, anyio, zod.
- 3 runs per cell. 12 x 2 models x 4 conditions x 3 = 288 runs, in a shuffled order (seed 27), 2 at a time. Each repo is a clean git worktree at the listed commit; tools are read-only, and `git status` is checked after the runs.

| Condition | Prompt | Subagent effort |
|---|---|---|
| C0 | question only | not set |
| C1 | question + " Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself." (the wording used in the pilots) | low |
| C2 | same as C1 | medium |
| C3 | same as C1 | high |

In pilots, no headless run used a subagent without being told to. So C0 is the plain baseline, not a "subagents off" arm.

## Answer key

Built by `keys/build_keys.py` before any run: a regex over the repo source, then the enclosing function, method or class from a parser
(@babel/parser for JS/TS, Python `ast`). Top-level hits outside any function are dropped. Key sizes: 3 to 28 items, 151 in total.

questions.json sha256: `4657429a357de492468c137da0fe3c95daac2e79cf99b8e2ac5377e43e5246ec`
scoring/score.py sha256: `31aff38223817649733f0542f35f9726c3b358dcbb5e13425d9bc5ee3370b656`

## Scoring

Recall per run = key items found / key items. An item is found when the final answer contains the item's file name
and, on one line, one of its accepted names (`Class.method` also counts when `Class` and `method` appear as whole words on the same line).
Extra items in the answer are not penalised; they are counted separately as answer length.

Also recorded per run: API cost (`total_cost_usd`), wall time, turns, number of subagent calls, and the model each subagent ran on.

## Analysis

- Main comparison: mean recall per question, C1 vs C3, per model. Then C0 vs C1.
- An effect is a difference of **15 points or more** in mean recall across the 12 questions. Smaller differences are reported as no effect.
- Cost is reported as percent change against C0.
- Runs that fail or time out (20 min) score 0 and are reported.

## Limits

12 questions, all "find every place" searches with a single right list. One prompt wording. One Claude Code version.
The key is regex-based; a correct item that the regex misses would count against no one but is not credited either.
