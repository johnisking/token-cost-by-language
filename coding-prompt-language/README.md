# Coding in your own language: does the prompt language change what Claude Code and Codex cost?

The same brick-breaker task given to Claude Code and Codex in English, Korean, Japanese, Spanish and Ukrainian, five runs each (50 runs): input and output tokens, time, cost, whether the game ran, and the language of the game text and code comments.

**Headline:** asking in Korean, Japanese, Spanish or Ukrainian cost about the same as asking in English: over 5 runs per language, the median input tokens per task stayed within 1.2% of the English median in both tools. What changed was the game itself: its on-screen text, and Claude Code's code comments, followed the language of the prompt.

- Source page, chart and method: https://tokensave.app/data/ai-coding-prompt-language
- Related: Claude Code vs Codex same-task runs (https://huggingface.co/datasets/JOHNISKING/claude-code-vs-codex-tokens), web search by language (https://huggingface.co/datasets/JOHNISKING/claude-web-search-by-language)
- DOI (Zenodo): [10.5281/zenodo.23454308](https://doi.org/10.5281/zenodo.23454308) (the Zenodo record also has the raw logs, the generated games and the scripts)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/ai-coding-prompt-language) · [Kaggle](https://www.kaggle.com/datasets/johnisking/coding-prompt-language-claude-code-vs-codex)
- Measured: 2026-10-18 and 2026-10-19
- License: CC BY 4.0

## Key findings

- The prompt language barely moves the bill for agentic coding. Median input tokens: Claude Code 79,213 in English vs 78,381 to 80,134 in the other four languages; Codex 48,600 vs 48,163 to 48,950. The prompt is about a hundred tokens; the agent's own instructions, tools and code make up the rest.
- Output did not grow either: median 7,870 tokens in English vs 7,116 to 8,841 for Claude Code, 3,476 vs 3,038 to 3,739 for Codex, inside the run-to-run spread. A task cost $0.31 to $0.43 in any language at the API list prices Claude Code reports.
- The run matters more than the language. The most expensive runs were English: 2 of 5 English Claude Code runs took an extra agent step (122,899 to 123,666 input tokens) and one English Codex run made an extra model call (64,581). None of the 20 non-English Claude Code runs took the extra step; with five runs per language this looks like chance.
- In all 40 non-English runs the game's on-screen text was in the prompt's language. Claude Code wrote its code comments in that language in all 20 of its non-English runs and, in 3 of 5 Spanish runs, named variables and functions in Spanish (`paleta`, `ladrillos`, `dibujarBola`). Codex wrote 4 comments in its 20 non-English runs, all in English.
- 49 of 50 games loaded and responded to keyboard and mouse in a headless browser without script errors. The exception, a Codex run with the Ukrainian prompt, crashed on a canvas error (a particle effect drew a circle with a negative radius).
- The language tax is a chat problem: in an agentic coding task it is lost in the agent's fixed overhead.

## Files

- `ai-coding-prompt-language.csv`: one row per run with `tool, prompt_language, run, input_tokens, cached_input_tokens, output_tokens, seconds, api_cost_usd, agent_turns, file_chars, file_lines, works, ui_language, reply_language, non_ascii_letters_in_script`
- `ai-coding-prompt-language.json`: the same data plus the exact prompts
- `build_combined.py`, `parse.py`: rebuild the table from the raw logs (raw logs and generated games are in the Zenodo record)
- `check_works.py`: the headless browser check

## Results

| Prompt language | Tool | Input tokens (median) | Input tokens (range) | Output tokens (median) | Time (median) | API cost (range) | Game works | Game text language |
|---|---|---:|---:|---:|---:|---:|---:|---|
| English | Claude Code | 79,213 | 78,058 to 123,666 | 7,870 | 64 s | $0.35 to $0.42 | 5 / 5 | English |
| English | Codex | 48,600 | 47,954 to 64,581 | 3,476 | 39 s | – | 5 / 5 | English |
| Korean | Claude Code | 78,381 | 77,399 to 80,452 | 7,116 | 59 s | $0.34 to $0.42 | 5 / 5 | Korean |
| Korean | Codex | 48,793 | 47,677 to 48,868 | 3,632 | 37 s | – | 5 / 5 | Korean |
| Japanese | Claude Code | 79,053 | 78,263 to 80,471 | 7,583 | 70 s | $0.36 to $0.42 | 5 / 5 | Japanese |
| Japanese | Codex | 48,756 | 48,063 to 49,184 | 3,544 | 39 s | – | 5 / 5 | Japanese |
| Spanish | Claude Code | 80,134 | 76,570 to 80,764 | 8,841 | 82 s | $0.31 to $0.43 | 5 / 5 | Spanish |
| Spanish | Codex | 48,163 | 47,740 to 49,107 | 3,038 | 38 s | – | 5 / 5 | Spanish |
| Ukrainian | Claude Code | 79,926 | 78,718 to 80,777 | 8,628 | 71 s | $0.37 to $0.43 | 5 / 5 | Ukrainian |
| Ukrainian | Codex | 48,950 | 47,898 to 49,736 | 3,739 | 35 s | – | 4 / 5 | Ukrainian |

## Method

1. Both tools on one Windows laptop, effort medium, each run in its own empty folder, prompt sent through standard input.
2. Claude Code 2.1.295 (Opus 5.5): `claude -p --permission-mode acceptEdits --output-format json`, no MCP servers; input summed over every model incl. cache reads.
3. Codex CLI 0.162 (gpt-6-luna): `codex exec --json -s workspace-write`; tokens from `turn.completed`.
4. Runs 1-2 measured 2026-10-18 (English runs 1-2 are the same-task runs of the Claude Code vs Codex dataset); runs 3-5 for all five languages added 2026-10-19 with the same versions and settings, cycling through the languages in turn.
5. "Game works": loaded in headless Chromium with a canvas, took mouse clicks and arrow keys for about two seconds, no script errors.

## Limitations

- One small task, five runs per language and tool; longer conversations in another language would add more non-English text to the context.
- Cost figures are list-price estimates; subscription plans are not billed per token.

## Citation

TokenSave (2026). Coding in your own language: does the prompt language change what Claude Code and Codex cost? [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23454308

Check your own Claude Code usage at [tokensave.app](https://tokensave.app/claude-code-usage).
