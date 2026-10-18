# Token cost by programming language: the same programs in 10 languages on Claude, Gemini and GPT

Two small programs (an inventory class and Dijkstra's shortest path) written in Python, Ruby, JavaScript, TypeScript, PHP, Rust, Java, C++, Go and C, with input tokens counted on Claude Opus/Sonnet 5.5, Claude Haiku 4.5, Gemini 3.x and GPT (o200k_base).

**Headline:** both programs together cost 809 GPT tokens in Python and 1,536 in C (+90%). Python and Ruby were the cheapest on every tokenizer; Go and C the most expensive. Claude 5.5 needed 43% to 59% more tokens than GPT for the same code.

- Source page, chart and method: https://tokensave.app/data/token-cost-by-programming-language
- Related: token cost by data format (https://tokensave.app/data/token-cost-by-format)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Python and Ruby are the cheapest: 809 and 819 GPT tokens. JavaScript needs +20%, Java +50%, Go +68% and C +90%.
- The ranking holds on every tokenizer tested.
- Claude 5.5 costs 43% to 59% more than GPT for the same code (largest gap: Java). Gemini needs 12% to 25% more than GPT.
- Types add tokens: TypeScript needs 11% more GPT tokens than the same JavaScript.
- File size is a rough guide only: Java has the most characters, but Go and C need more tokens.

## Files

- `token-cost-by-programming-language.csv`: one row per language and program (`inventory`, `dijkstra` and `total`) with `language, program, characters, lines, claude55_tokens, claude45_tokens, gemini_tokens, gpt_tokens`
- `token-cost-by-programming-language.json`: the same data plus all 20 source files, so every count can be reproduced

## Data (both programs together)

| Language | Characters | Claude Opus/Sonnet 5.5 | Claude Haiku 4.5 | Gemini 3.x | GPT (o200k) | GPT vs Python |
|---|---:|---:|---:|---:|---:|---:|
| Python | 2,887 | 1,176 | 970 | 963 | 809 | ±0% |
| Ruby | 2,478 | 1,181 | 961 | 944 | 819 | +1% |
| JavaScript | 3,195 | 1,442 | 1,199 | 1,184 | 967 | +20% |
| TypeScript | 3,610 | 1,590 | 1,311 | 1,288 | 1,070 | +32% |
| PHP | 3,697 | 1,609 | 1,311 | 1,262 | 1,128 | +39% |
| Rust | 4,081 | 1,815 | 1,452 | 1,411 | 1,189 | +47% |
| Java | 5,101 | 1,934 | 1,551 | 1,511 | 1,217 | +50% |
| C++ | 4,793 | 1,933 | 1,626 | 1,617 | 1,343 | +66% |
| Go | 4,292 | 2,143 | 1,749 | 1,701 | 1,359 | +68% |
| C | 4,843 | 2,219 | 1,859 | 1,820 | 1,536 | +90% |

## Method

1. Each program written idiomatically in each language with no comments. Every version was compiled or run and printed exactly the same output as the Python version.
2. Claude: each file sent through Claude Code (`claude -p`) with a fixed one-line system prompt; input tokens minus the same run with a one-character message. Opus 5.5 and Sonnet 5.5 gave identical counts; a re-run gave identical counts.
3. Gemini: Google AI Studio prompt token counter on Gemini 3.8 Flash, minus its one start token.
4. GPT: tiktoken with `o200k_base`.

## Limitations

- Two small programs. Comments, long names or boilerplate in real projects can shift the numbers; the ranking is more stable than the exact percentages.
- Coding style changes the count within a language.
- Input tokens only; not a measure of how well each model writes each language.

## Citation

TokenSave (2026). Token cost by programming language: the same programs in 10 languages on Claude, Gemini and GPT [Data set]. https://tokensave.app/data/token-cost-by-programming-language

Count tokens for your own code at [tokensave.app](https://tokensave.app/).
