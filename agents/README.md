# Claude Code vs Codex: startup tokens, MCP tools and the same coding task

Input tokens Claude Code and Codex use before doing any work, what adding 1 to 30 MCP tools adds, and tokens, time and output for the same browser-game task at medium effort.

**Headline:** a one-word reply costs 35,776 input tokens in Claude Code (Opus 5.5) and 14,748 in Codex (gpt-6-luna). On the same coding task Codex used 40% fewer input tokens and 47% fewer output tokens (5 runs each). Adding 30 MCP tools barely changed either.

- Source page, chart and method: https://tokensave.app/data/claude-code-vs-codex-tokens
- Related: Claude effort levels (https://tokensave.app/data/claude-effort-cost)
- DOI (Zenodo): [10.5281/zenodo.23448342](https://doi.org/10.5281/zenodo.23448342)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-code-vs-codex-tokens) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-code-vs-codex-startup-and-task-tokens)
- Measured: 2026-10-18 and 2026-10-22 (v2: 4 startup and 5 task runs per tool)
- License: CC BY 4.0

## Key findings

- Claude Code starts 143% heavier: 35,776 vs 14,748 (average of 4 runs) input tokens for a one-word reply. That fixed amount is sent with every request (mostly cached).
- Adding MCP tools barely changed startup tokens. The full definitions of our 30 test tools are 4,541 tokens, but adding them raised Claude Code by 391 tokens (about 13 per tool) and Codex by nothing measurable. Both load a tool's details only when needed.
- Using the tools is what costs: asked to list the 10 test tools and call one, Codex used 47,876 input tokens (+225% over its plain startup).
- Same task, fewer tokens on Codex: Claude Code averaged 87,779 input and 7,669 output tokens (62 s, $0.39 at API prices); Codex 52,762 input and 4,073 output tokens (56 s). All 10 games worked.
- Claude Code wrote more code: 474 lines on average vs 58 for Codex, which wrote denser code.

## Files

- `claude-code-vs-codex-tokens.csv`: one row per run with `test` (`startup` or `same_task`), `tool`, `model`, `mcp_tools`, `run`, `input_tokens`, `cached_input_tokens`, `output_tokens`, `seconds`, `api_cost_usd`, `file_lines`
- `claude-code-vs-codex-tokens.json`: the same data plus prompts and setup
- `mcp_dummy.js`: the test MCP server (`node mcp_dummy.js <number_of_tools>`)

## Startup tokens and MCP tools (average of 2 runs)

| Setup | Claude Code (Opus 5.5) | Codex (gpt-6-luna) |
|---|---:|---:|
| 0 MCP tools | 35,776 | 14,748 |
| 1 MCP tool | 35,792 (+16) | 14,648 (-100) |
| 10 MCP tools | 35,915 (+139) | 14,648 (-100) |
| 30 MCP tools | 36,167 (+391) | 14,648 (-100) |

## The same coding task

Prompt: "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."

| Run | Input tokens | Output tokens | Time | Lines | API cost |
|---|---:|---:|---:|---:|---:|
| Claude Code · run 1 | 123,666 | 8,537 | 73 s | 487 | $0.42 |
| Claude Code · run 2 | 79,213 | 7,870 | 63 s | 527 | $0.39 |
| Codex · run 1 | 47,954 | 2,872 | 33 s | 49 | – |
| Codex · run 2 | 48,815 | 3,803 | 41 s | 117 | – |
| Claude Code · run 3 (2026-10-22) | 79,316 | 7,897 | 62 s | 513 | $0.39 |
| Claude Code · run 4 | 77,868 | 6,595 | 52 s | 421 | $0.35 |
| Claude Code · run 5 | 78,830 | 7,447 | 60 s | 420 | $0.38 |
| Codex · run 3 (2026-10-22) | 70,704 | 7,118 | 75 s | 29 | – |
| Codex · run 4 | 48,362 | 3,468 | 72 s | 46 | – |
| Codex · run 5 | 47,975 | 3,103 | 57 s | 51 | – |

## Method

1. Both tools on the same Windows laptop, each run in its own empty folder.
2. Claude Code 2.1.295, default model Opus 5.5, Max plan: `claude -p --output-format json`, MCP servers only from `--mcp-config` with `--strict-mcp-config`; task at `--effort medium --permission-mode acceptEdits`. Input = input + cache creation + cache read tokens; cost is Claude Code's API-price figure.
3. Codex CLI 0.162, default model gpt-6-luna, ChatGPT plan: `codex exec --json`, reasoning effort low (startup) and medium (task); MCP server via `-c mcp_servers.…`. Input tokens include cached tokens; no price on a ChatGPT plan.
4. Every game was opened in a headless browser: no errors, two levels, score and three lives on screen.

## Limitations

- Four startup and five task runs per tool, one task. One Claude Code task run took an extra step (123,666 input tokens) and one Codex run read 70,704.
- Default models and per-token prices differ, so fewer tokens is not automatically cheaper.
- Startup tokens include each tool's installed skills and plugins on this machine.
- Cursor will be added when its free-plan limit resets.

## Citation

TokenSave (2026). Claude Code vs Codex: startup tokens, MCP tools and the same coding task [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23448342

See your own Claude Code and Codex usage at [tokensave.app](https://tokensave.app/claude-code-usage).
