# What the Claude Code harness costs: plugins, subagents, plan mode, skills and hooks on the same task

The same small coding task (a brick-breaker game in one HTML file) run five times each under seven Claude Code settings: default, safe mode, a minimal harness, a subagent, plan mode, a project skill and a hook (35 runs). Input and output tokens, cache reads, API cost, time, tool calls and whether the game worked.

**Headline:** most of what Claude Code sends to the model is its own harness, not your task. The median run used 78,723 input tokens in a default setup and 8,214 with a one-line system prompt and two tools (−90%); every game still worked. Delegating the task to a subagent cost 128% more, and installed plugins added cost even when none was used.

- Source page, chart and method: https://tokensave.app/data/claude-code-harness-cost
- Related: Claude Code vs Codex startup tokens and the same task (https://tokensave.app/data/claude-code-vs-codex-tokens)
- Measured: 2026-10-19
- License: CC BY 4.0

## Key findings

- The harness is about 90% of the input. With the system prompt and tool descriptions replaced by one sentence and two tools (Write and Read), the median run used 8,214 input tokens instead of 78,723 and cost $0.13 instead of $0.37 (−64%). The games were also shorter (median 7,904 characters against 13,375), so part of the saving is output.
- Installed plugins cost tokens even when unused. The laptop has 35 plugins installed (376 skills and 19 agents listed to the model). `--safe-mode` loaded 3 plugins, 19 skills and 5 agents with the same 27 tools; no run used a plugin, yet safe mode cut the median input by 39% (30,660 tokens per task) and the cost by 54%. The games came out shorter here too (4,718 output tokens against 7,364), so not all of the cost drop is input.
- A subagent is the most expensive way to do a small task: 534,125 input tokens (+578%), $0.85 (+128%) and 178 seconds instead of 61. Claude Code delegated in all 5 runs.
- Plan mode, then build (two calls): 245,562 input tokens (+212%) but only +26% in cost, because most of the extra input is read from the prompt cache.
- A project skill (1.9 KB, used in all 5 runs) raised input +101% and cost +2%; a PostToolUse hook raised input +54% and cost +3%.
- All 35 games loaded and responded to keyboard and mouse in a headless browser without script errors.
- Earlier TokenSave Claude Code datasets were measured on the same laptop with the same plugins, so their absolute Claude Code numbers include this plugin overhead; comparisons inside each dataset are unaffected.

## Files

- `claude-code-harness-cost.csv`: one row per run with `condition, run, input_tokens, cache_read_tokens, output_tokens, api_cost_usd, seconds, tool_calls, subagent_tool_calls, used_subagent, used_skill, file_chars, works, tools, subagent_tools`
- `claude-code-harness-cost.json`: the same data plus the prompts and the settings
- `raw-logs-and-setup.zip`: the raw stream-json log of every run, every generated `index.html`, the run script, the hook, the hook settings and the skill
- `build_combined.py`: rebuilds the table from the raw logs
- `check_works.py`: the headless browser check

## Results

| Setting | Input tokens (median) | vs default | of which cache reads | Output tokens | API cost (median) | vs default | Time | Game size (chars) | Game works |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Default | 78,723 | – | 51,772 | 7,364 | $0.37 | – | 61 s | 13,375 | 5 / 5 |
| Safe mode (no personal plugins) | 48,063 | −39% | 39,510 | 4,718 | $0.17 | −54% | 38 s | 7,921 | 5 / 5 |
| Minimal harness (1-line system prompt, Write and Read) | 8,214 | −90% | 3,439 | 4,676 | $0.13 | −64% | 45 s | 7,904 | 5 / 5 |
| + PostToolUse hook | 121,553 | +54% | 94,431 | 7,393 | $0.39 | +3% | 65 s | 12,013 | 5 / 5 |
| + one project skill | 158,393 | +101% | 131,068 | 6,740 | $0.38 | +2% | 55 s | 11,240 | 5 / 5 |
| Plan mode, then build | 245,562 | +212% | 214,983 | 9,013 | $0.47 | +26% | 84 s | 12,082 | 5 / 5 |
| Delegated to a subagent | 534,125 | +578% | 465,928 | 15,486 | $0.85 | +128% | 178 s | 17,900 | 5 / 5 |

## Method

1. Claude Code 2.1.295 with Opus 5.5 on one Windows laptop, effort medium, no MCP servers (`--strict-mcp-config` with an empty config), each run in its own empty folder, prompt sent through standard input; seven settings run in turn, five rounds, on 2026-10-19.
2. Default: `claude -p --effort medium --output-format stream-json --verbose --permission-mode acceptEdits`. Safe mode adds `--safe-mode`. Minimal: `--system-prompt "You are a coding agent. Use your tools to complete the user's task." --tools Write,Read`. Subagent: one more sentence in the prompt asking to delegate with the Agent tool. Plan: `--permission-mode plan`, then `claude -c` with "Go ahead and implement your plan." (both calls added). Skill: `.claude/skills/html-canvas-games/SKILL.md` in the working folder. Hook: a PostToolUse hook on Write and Edit returning a reminder to check the requirements.
3. Tokens and cost from `modelUsage` and `total_cost_usd` in the final `result` event (input = input + cache reads + cache writes); tools, skills, plugins and agents from the `system/init` event.
4. "Game works": loaded in headless Chromium with a canvas, took mouse clicks and arrow keys for about two seconds, no script errors.

Task prompt: "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."

## Limitations

- One small task and five runs per setting; on larger tasks a skill, a plan or a subagent may save rework this task never needed.
- The plugin overhead depends on what is installed; 35 plugins is a heavy setup.
- The minimal harness has no shell, search or edit tools; it measures overhead and is not a recommended setup.
- Cost figures are API list-price estimates; subscription plans are not billed per token.
