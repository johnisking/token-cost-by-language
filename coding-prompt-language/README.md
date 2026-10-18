# Coding in your own language: does the prompt language change what Claude Code and Codex cost?

The same brick-breaker task given to Claude Code and Codex in English, Korean, Japanese, Spanish and Ukrainian, two runs each: input and output tokens, time, cost, whether the game ran, and the language of the game text and code comments.

**Headline:** asking in Korean, Japanese, Spanish or Ukrainian cost about the same as asking in English: 77,083 to 80,598 input tokens in Claude Code and 47,677 to 49,257 in Codex. What changed was the game itself: its on-screen text, and Claude Code's code comments, followed the language of the prompt.

- Source page, chart and method: https://tokensave.app/data/ai-coding-prompt-language
- Related: Claude Code vs Codex same-task runs ([`../agents/`](../agents/)), web search by language ([`../search-language/`](../search-language/))
- DOI (Zenodo): [10.5281/zenodo.23454308](https://doi.org/10.5281/zenodo.23454308)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/ai-coding-prompt-language) · [Kaggle](https://www.kaggle.com/datasets/johnisking/coding-prompt-language-claude-code-vs-codex)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- The prompt language barely moves the bill for agentic coding: Claude Code 77,083 to 80,598 input tokens with non-English prompts vs 79,213 for a comparable English run; Codex 47,677 to 49,257 vs 47,954 to 48,815. The prompt is about a hundred tokens; the agent's own instructions, tools and code make up the rest.
- Output tokens showed no consistent language premium, and a task cost $0.33 to $0.42 in any language at the API list prices Claude Code reports.
- The run matters more than the language: one English Claude Code run took an extra agent step and used 123,666 input tokens.
- In all 16 non-English runs the game's on-screen text was in the prompt's language. Claude Code wrote its code comments in that language in every run; Codex wrote almost no comments.
- All 20 games loaded and responded to keyboard and mouse in a headless browser without script errors.
- The language tax is a chat problem: in an agentic coding task it is lost in the agent's fixed overhead.

## Files

- `ai-coding-prompt-language.csv`: one row per run with `tool, prompt_language, run, input_tokens, cached_input_tokens, output_tokens, seconds, api_cost_usd, agent_turns, file_chars, file_lines, works, ui_language, reply_language, non_ascii_letters_in_script`
- `ai-coding-prompt-language.json`: the same data plus the exact prompts

## Results

| Prompt language | Tool | Input tokens (run 1 / 2) | Output tokens (run 1 / 2) | Time (avg) | API cost (run 1 / 2) | Game works | Game text language |
|---|---|---:|---:|---:|---:|---:|---|
| English | Claude Code | 123,666 / 79,213 | 8,537 / 7,870 | 68 s | $0.42 / $0.39 | 2 / 2 | English |
| English | Codex | 47,954 / 48,815 | 2,872 / 3,803 | 37 s | – / – | 2 / 2 | English |
| Korean | Claude Code | 78,282 / 78,381 | 6,976 / 7,116 | 59 s | $0.36 / $0.37 | 2 / 2 | Korean |
| Korean | Codex | 47,677 / 48,793 | 2,536 / 3,649 | 37 s | – / – | 2 / 2 | Korean |
| Japanese | Claude Code | 80,471 / 78,974 | 9,045 / 7,501 | 68 s | $0.42 / $0.38 | 2 / 2 | Japanese |
| Japanese | Codex | 49,078 / 48,063 | 3,858 / 2,837 | 38 s | – / – | 2 / 2 | Japanese |
| Spanish | Claude Code | 80,598 / 77,083 | 9,212 / 5,797 | 67 s | $0.42 / $0.33 | 2 / 2 | Spanish |
| Spanish | Codex | 48,163 / 48,192 | 3,038 / 3,058 | 38 s | – / – | 2 / 2 | Spanish |
| Ukrainian | Claude Code | 79,506 / 79,926 | 8,137 / 8,648 | 70 s | $0.39 / $0.41 | 2 / 2 | Ukrainian |
| Ukrainian | Codex | 49,257 / 47,898 | 3,986 / 2,651 | 36 s | – / – | 2 / 2 | Ukrainian |

## Method

1. Both tools on one Windows laptop, effort medium, each run in its own empty folder, prompt sent through standard input.
2. Claude Code 2.1.295 (Opus 5.5): `claude -p --permission-mode acceptEdits --output-format json`, no MCP servers; input summed over every model incl. cache reads.
3. Codex CLI 0.162 (gpt-6-luna): `codex exec --json -s workspace-write`; tokens from `turn.completed`.
4. English runs are the same-task runs of the Claude Code vs Codex dataset (`../agents/`), measured the same day with the same settings.
5. "Game works": loaded in headless Chromium with a canvas, took mouse clicks and arrow keys for two seconds, no script errors.

## Limitations

- One small task, two runs per language and tool; longer conversations in another language would add more non-English text to the context.
- Cost figures are list-price estimates; subscription plans are not billed per token.

## Citation

TokenSave (2026). Coding in your own language: does the prompt language change what Claude Code and Codex cost? [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23454308

Check your own Claude Code usage at [tokensave.app](https://tokensave.app/claude-code-usage).
