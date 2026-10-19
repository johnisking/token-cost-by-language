# Token cost by language: 41 languages measured on GPT tokenizers

The same everyday prompt, translated into 41 languages and counted with OpenAI's `o200k_base` (GPT-4o and later) and `cl100k_base` (GPT-4, GPT-3.5) tokenizers.

**Headline:** English needs 34 tokens. The other 40 languages need 35–83 tokens on `o200k_base`: from **+3% (Simplified Chinese)** to **+144% (Punjabi)**. Korean +44%, Japanese +79%, Spanish +18%, German +26%, Hindi +50%.

The newer `o200k_base` tokenizer narrowed the gap a lot for most languages. On the older `cl100k_base`, Korean was +150% and Hindi +359%.

- Source page, chart and method: https://tokensave.app/data/token-cost-by-language
- DOI (Zenodo archive): [10.5281/zenodo.23427148](https://doi.org/10.5281/zenodo.23427148)
- Measured: 2026-09-30 · counts re-verified: 2026-10-16
- License: CC BY 4.0 (free to reuse with attribution and a link)

## Also in this repo

- [`claude-gemini/`](claude-gemini/): the same prompt on Claude Opus/Sonnet 5.5, Claude Haiku 4.5, Gemini 3.x and GPT o200k (measured 2026-10-17, DOI [10.5281/zenodo.23428350](https://doi.org/10.5281/zenodo.23428350)). Korean needs 89 Claude tokens vs 49 on GPT and 48 on Gemini.
- [`format/`](format/): the same 20-row table in 8 data formats (JSON, YAML, XML, CSV, TSV, Markdown, TOON) on the same four tokenizers (measured 2026-10-17, DOI [10.5281/zenodo.23435788](https://doi.org/10.5281/zenodo.23435788)). CSV needs 68% fewer GPT tokens than indented JSON.
- [`image/`](image/): input tokens for one image at 10 resolutions on Claude 5.5, Claude Haiku 4.5, Gemini and GPT (measured 2026-10-18, DOI [10.5281/zenodo.23443906](https://doi.org/10.5281/zenodo.23443906)). A 12 MP photo costs 1,065 tokens on Gemini, 4,005 on Claude 5.5 and 14,364 on GPT-6 Astra by default.
- [`code/`](code/): the same two programs in 10 programming languages on Claude 5.5, Claude Haiku 4.5, Gemini and GPT (measured 2026-10-18, DOI [10.5281/zenodo.23446563](https://doi.org/10.5281/zenodo.23446563)). Python costs 809 GPT tokens and C 1,536 (+90%).
- [`pdf/`](pdf/): input tokens for text, table and scanned PDF pages on Claude and Gemini, vs pasting the same text (measured 2026-10-18, v2 adds Codex and Cursor, DOI [10.5281/zenodo.23446565](https://doi.org/10.5281/zenodo.23446565)). A text page costs 2,347 tokens as a PDF on Claude 5.5 and 728 pasted.
- [`effort/`](effort/): the same coding task at each Claude effort level, Opus 5.5 low to max and Sonnet 5.5 (measured 2026-10-09, DOI [10.5281/zenodo.23446567](https://doi.org/10.5281/zenodo.23446567)). Medium cost $0.56 and max $5.25.
- [`agents/`](agents/): Claude Code vs Codex — startup tokens, the cost of 1 to 30 MCP tools and the same coding task (measured 2026-10-18, DOI [10.5281/zenodo.23448342](https://doi.org/10.5281/zenodo.23448342)). A one-word reply costs 35,771 input tokens in Claude Code and 14,678 in Codex.
- [`search/`](search/): web search in Claude Code and Codex — tokens, searches and the sites seen and cited for four kinds of question (measured 2026-10-18, DOI [10.5281/zenodo.23449842](https://doi.org/10.5281/zenodo.23449842)). A one-line fact question cost 150,414 input tokens in Claude Code and 33,296 in Codex.
- [`search-language/`](search-language/): AI web search by language — Claude Code and Codex in English, Korean, Japanese, Spanish and Ukrainian, plus local topics about Seoul, Tokyo, Madrid and Kyiv (measured 2026-10-18, DOI [10.5281/zenodo.23451506](https://doi.org/10.5281/zenodo.23451506)). English searches for AI topics, local-language searches for local topics.
- [`agent-instructions/`](agent-instructions/): CLAUDE.md and AGENTS.md size — tokens and cost per request for 0–50 KB instruction files in Claude Code and Codex (measured 2026-10-18, DOI [10.5281/zenodo.23453217](https://doi.org/10.5281/zenodo.23453217)). A 50 KB CLAUDE.md adds 15,985 tokens per request; Codex ignores AGENTS.md text past 32 KiB.
- [`coding-prompt-language/`](coding-prompt-language/): the same coding task prompted in English, Korean, Japanese, Spanish and Ukrainian in Claude Code and Codex (measured 2026-10-18, DOI [10.5281/zenodo.23454308](https://doi.org/10.5281/zenodo.23454308)). Almost the same tokens in every language; the game text and comments follow the prompt.
- [`harness/`](harness/): what the Claude Code harness costs — the same coding task under seven settings: default, safe mode, a minimal harness, a subagent, plan mode, a project skill and a hook (measured 2026-10-19). The harness is about 90% of the input tokens; a subagent cost 128% more.

## Files

- `token-cost-by-language.csv`: one row per language with `language_code, language, o200k_tokens, o200k_vs_english_pct, cl100k_tokens, cl100k_vs_english_pct, prompt` (the translated prompt is included so every count can be reproduced)
- `token-cost-by-language.json`: the same data plus metadata

## Data

| Language | o200k tokens | vs English | cl100k tokens | vs English |
|---|---:|---:|---:|---:|
| English | 34 | ±0% | 34 | ±0% |
| Chinese (Simplified) | 35 | +3% | 52 | +53% |
| Indonesian | 39 | +15% | 47 | +38% |
| Spanish | 40 | +18% | 44 | +29% |
| Portuguese | 41 | +21% | 48 | +41% |
| Persian | 42 | +24% | 95 | +179% |
| German | 43 | +26% | 51 | +50% |
| Arabic | 43 | +26% | 103 | +203% |
| French | 44 | +29% | 49 | +44% |
| Dutch | 44 | +29% | 59 | +74% |
| Swedish | 45 | +32% | 51 | +50% |
| Norwegian | 45 | +32% | 53 | +56% |
| Russian | 45 | +32% | 73 | +115% |
| Danish | 46 | +35% | 54 | +59% |
| Chinese (Traditional) | 46 | +35% | 72 | +112% |
| Vietnamese | 46 | +35% | 79 | +132% |
| Italian | 47 | +38% | 54 | +59% |
| Finnish | 49 | +44% | 69 | +103% |
| Korean | 49 | +44% | 85 | +150% |
| Turkish | 50 | +47% | 70 | +106% |
| Hindi | 51 | +50% | 156 | +359% |
| Filipino | 52 | +53% | 60 | +76% |
| Romanian | 52 | +53% | 60 | +76% |
| Hebrew | 53 | +56% | 128 | +276% |
| Urdu | 54 | +59% | 144 | +324% |
| Gujarati | 54 | +59% | 244 | +618% |
| Marathi | 56 | +65% | 167 | +391% |
| Bengali | 57 | +68% | 207 | +509% |
| Hungarian | 59 | +74% | 77 | +126% |
| Thai | 59 | +74% | 126 | +271% |
| Japanese | 61 | +79% | 75 | +121% |
| Kannada | 61 | +79% | 318 | +835% |
| Malayalam | 63 | +85% | 343 | +909% |
| Polish | 64 | +88% | 72 | +112% |
| Ukrainian | 64 | +88% | 107 | +215% |
| Tamil | 67 | +97% | 288 | +747% |
| Slovak | 68 | +100% | 86 | +153% |
| Czech | 68 | +100% | 88 | +159% |
| Telugu | 69 | +103% | 319 | +838% |
| Greek | 70 | +106% | 168 | +394% |
| Punjabi | 83 | +144% | 252 | +641% |

## Method

1. One English prompt: "Please summarize the customer email below in three bullet points and suggest a polite reply. The customer says the order arrived two days late and one item was missing from the box."
2. Translated into each language (machine translation as a first draft, then checked).
3. Counted with [tiktoken](https://github.com/openai/tiktoken) using `o200k_base` and `cl100k_base`.
4. "vs English" = tokens in the language ÷ English tokens − 1, rounded to a whole percent.

## Limitations

- One prompt. With other text the ratios move by roughly ±10–20 percentage points; the ranking is more stable than the exact numbers.
- OpenAI tokenizers only. Claude and Gemini use their own tokenizers.
- Input text only; it does not measure output length.

## Citation

TokenSave (2026). Token cost by language: 41 languages measured on GPT tokenizers [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23427148

```bibtex
@misc{tokensave2026tokencost,
  title  = {Token cost by language: 41 languages measured on GPT tokenizers},
  author = {TokenSave},
  year   = {2026},
  publisher = {Zenodo},
  doi    = {10.5281/zenodo.23427148},
  url    = {https://tokensave.app/data/token-cost-by-language},
  note   = {Data set, CC BY 4.0}
}
```

Count tokens for your own text in any of these languages at [tokensave.app](https://tokensave.app/).
