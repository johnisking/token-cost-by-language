# Same code, about 60% more output tokens: Claude vs GPT vs Gemini in four coding tools and five languages

DOI: https://doi.org/10.5281/zenodo.23585139

Measured 2026-10-18 to 2026-10-23 on Windows 11. The same brick-breaker task, prompted in English, Korean, Japanese, Spanish and Ukrainian, in Claude Code 2.1.295 (Opus 5.5), Codex CLI 0.162 (gpt-6-luna) and Antigravity CLI 1.4.5 (Gemini 4 Argon and Claude Opus 5.5). 100 runs (v2: five runs per tool and language). License: CC BY 4.0.

Page with tables, chart and method: https://tokensave.app/data/output-tokens-per-character-by-model

## Key numbers

Output tokens per 1,000 characters of the index.html each run wrote (average over the five languages):

- Claude Code + Opus 5.5: 591 (554 to 624 by language)
- Antigravity + Opus 5.5: 602 (576 to 620)
- Antigravity + Gemini 4 Argon: 372 (363 to 382)
- Codex + gpt-6-luna: 376 (366 to 386)

Opus needed about 60% more output tokens per character than Gemini and about 57% more than GPT, and came out the same in both tools that ran it. Prompt language moved input tokens by only a few percent inside each tool. 99 of 100 games worked (score, level 2, lives 3-2-1-0) and all showed their text in the prompt language.

## Tokenizer check (v1.2, 2026-10-24)

76 of the game files counted with each company's own tokenizer, regardless of which model wrote them. Tokens per 1,000 characters (median):

| Code written by | Claude 5.5 | Gemini 4 Argon | GPT (o200k) |
|---|---:|---:|---:|
| Claude Code + Opus 5.5 (23 files) | 512 | 399 | 334 |
| Antigravity + Opus 5.5 (15) | 524 | 414 | 343 |
| Antigravity + Gemini 4 Argon (15) | 451 | 346 | 290 |
| Codex + gpt-6-luna (23) | 534 | 407 | 338 |

For the same code, Claude's tokenizer needs 55% more tokens than GPT's (+47% to +65% per file) and 29% more than Gemini's (+24% to +35%). Against GPT the output gap is the tokenizer; against Gemini the tokenizer explains about half, and Gemini's own code needed 13% to 15% fewer tokens per character under all three tokenizers.

Method: Claude via `claude -p` (Haiku 5.5, same tokenizer as Opus 5.5; no tools, no MCP) minus the same call with "a"; Gemini 4 Argon via the Google AI Studio token counter minus 31 (the count for "a" is 32); GPT with o200k locally. Repeating the first file gave identical counts.

## Files

- `output-tokens-per-character-by-model.csv` / `.json`: one row per run (tool, language, run, date, input tokens, cache reads reported separately, output tokens, seconds, file characters and lines, output tokens per 1,000 characters, game check, source).
- `output-tokens-per-character-by-model-chart.png`
- `runs/`: raw JSON and generated game of the 44 new Antigravity runs (runs 1-3 in Korean, Japanese, Spanish, Ukrainian; runs 4-5 in all five languages); Windows user name masked as USER.
- `output-tokens-per-character-tokenizer-check.csv` / `tokenizer_check.json`: per-file counts for the three tokenizers (v1.2).
- `scripts/check_brick_deep_i18n.py`: game checker that reads score, level and lives labels in all five languages; `check_brick_deep_i18n.json` its output.
- Claude Code and Codex runs: `../coding-prompt-language/`. Antigravity English runs: `../antigravity-cli/`.

Output tokens include the short final reply and the tool-call wrapping around the file, not only the code.

Cite: TokenSave (2026). Same code, about 60% more output tokens: Claude vs GPT vs Gemini in four coding tools and five languages [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23585139
