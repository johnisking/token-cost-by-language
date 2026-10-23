# Same code, about 60% more output tokens: Claude vs GPT vs Gemini in four coding tools and five languages

Measured 2026-10-18 to 2026-10-23 on Windows 11. The same brick-breaker task, prompted in English, Korean, Japanese, Spanish and Ukrainian, in Claude Code 2.1.295 (Opus 5.5), Codex CLI 0.162 (gpt-6-luna) and Antigravity CLI 1.4.5 (Gemini 4 Argon and Claude Opus 5.5). 80 runs. License: CC BY 4.0.

Page with tables, chart and method: https://tokensave.app/data/output-tokens-per-character-by-model

## Key numbers

Output tokens per 1,000 characters of the index.html each run wrote (average over the five languages):

- Claude Code + Opus 5.5: 591 (554 to 624 by language)
- Antigravity + Opus 5.5: 596 (574 to 612)
- Antigravity + Gemini 4 Argon: 372 (364 to 380)
- Codex + gpt-6-luna: 376 (366 to 386)

Opus needed about 60% more output tokens per character than Gemini and about 57% more than GPT, and came out the same in both tools that ran it. Prompt language moved input tokens by only a few percent inside each tool. 79 of 80 games worked (score, level 2, lives 3-2-1-0) and all showed their text in the prompt language.

## Files

- `output-tokens-per-character-by-model.csv` / `.json`: one row per run (tool, language, run, date, input tokens, cache reads reported separately, output tokens, seconds, file characters and lines, output tokens per 1,000 characters, game check, source).
- `output-tokens-per-character-by-model-chart.png`
- `runs/`: raw JSON and generated game of the 24 new Antigravity runs (Korean, Japanese, Spanish, Ukrainian); Windows user name masked as USER.
- `scripts/check_brick_deep_i18n.py`: game checker that reads score, level and lives labels in all five languages; `check_brick_deep_i18n.json` its output.
- Claude Code and Codex runs: `../coding-prompt-language/`. Antigravity English runs: `../antigravity-cli/`.

Output tokens include the short final reply and the tool-call wrapping around the file, not only the code.
