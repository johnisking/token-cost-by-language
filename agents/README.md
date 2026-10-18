# Claude Code vs Codex: startup tokens, MCP tools and the same coding task

Input tokens Claude Code and Codex use before doing any work, what adding 1 to 30 MCP tools adds, and tokens, time and output for the same browser-game task at medium effort.

**Headline:** a one-word reply costs 35,771 input tokens in Claude Code (Opus 5.5) and 14,678 in Codex (gpt-6-luna). On the same coding task Codex used 52% fewer input tokens and 59% fewer output tokens. Adding 30 MCP tools barely changed either.

- Source page, chart and method: https://tokensave.app/data/claude-code-vs-codex-tokens
- Related: Claude effort levels (https://tokensave.app/data/claude-effort-cost)
- DOI (Zenodo): [10.5281/zenodo.23448342](https://doi.org/10.5281/zenodo.23448342)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-code-vs-codex-tokens) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-code-vs-codex-startup-and-task-tokens)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Claude Code starts 144% heavier: 35,771 vs 14,678 input tokens for a one-word reply. That fixed amount is sent with every request (mostly cached).
- Adding MCP tools barely changed startup tokens. The full definitions of our 30 test tools are 4,541 tokens, but adding them raised Claude Code by 394 tokens (about 13 per tool) and Codex by 0. Both load a tool's details only when needed.
- Using the tools is what costs: asked to list the 10 test tools and call one, Codex used 47,876 input tokens (+226% over its plain startup).
- Same task, about half the tokens on Codex: Claude Code averaged 101,440 input and 8,204 output tokens (68 s, $0.41 at API prices); Codex 48,384 input and 3,338 output tokens (37 s). All four games worked.
- Claude Code wrote more code: 507 lines on average vs 83 for Codex, which wrote denser code.

## Files

- `claude-code-vs-codex-tokens.csv`: one row per run with `test` (`startup` or `same_task`), `tool`, `model`, `mcp_tools`, `run`, `input_tokens`, `cached_input_tokens`, `output_tokens`, `seconds`, `api_cost_usd`, `file_lines`
- `claude-code-vs-codex-tokens.json`: the same data plus prompts and setup
- `mcp_dummy.js`: the test MCP server (`node mcp_dummy.js <number_of_tools>`)

## Startup tokens and MCP tools (average of 2 runs)

| Setup | Claude Code (Opus 5.5) | Codex (gpt-6-luna) |
|---|---:|---:|
| 0 MCP tools | 35,771 | 14,678 |
| 1 MCP tool | 35,790 (+19) | 14,678 (+0) |
| 10 MCP tools | 35,913 (+142) | 14,678 (+0) |
| 30 MCP tools | 36,165 (+394) | 14,678 (+0) |

## The same coding task

Prompt: "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."

| Run | Input tokens | Output tokens | Time | Lines | API cost |
|---|---:|---:|---:|---:|---:|
| Claude Code · run 1 | 123,666 | 8,537 | 73 s | 487 | $0.42 |
| Claude Code · run 2 | 79,213 | 7,870 | 63 s | 527 | $0.39 |
| Codex · run 1 | 47,954 | 2,872 | 33 s | 49 | – |
| Codex · run 2 | 48,815 | 3,803 | 41 s | 117 | – |

## Method

1. Both tools on the same Windows laptop, each run in its own empty folder.
2. Claude Code 2.1.295, default model Opus 5.5, Max plan: `claude -p --output-format json`, MCP servers only from `--mcp-config` with `--strict-mcp-config`; task at `--effort medium --permission-mode acceptEdits`. Input = input + cache creation + cache read tokens; cost is Claude Code's API-price figure.
3. Codex CLI 0.162, default model gpt-6-luna, ChatGPT plan: `codex exec --json`, reasoning effort low (startup) and medium (task); MCP server via `-c mcp_servers.…`. Input tokens include cached tokens; no price on a ChatGPT plan.
4. Every game was opened in a headless browser: no errors, two levels, score and three lives on screen.

## Limitations

- Two runs per setting and one task; Claude Code's two task runs differed by 56% in input tokens.
- Default models and per-token prices differ, so fewer tokens is not automatically cheaper.
- Startup tokens include each tool's installed skills and plugins on this machine.
- Cursor will be added when its free-plan limit resets.

## Citation

TokenSave (2026). Claude Code vs Codex: startup tokens, MCP tools and the same coding task [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23448342

See your own Claude Code and Codex usage at [tokensave.app](https://tokensave.app/claude-code-usage).
