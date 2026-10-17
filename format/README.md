# Token cost by data format: JSON vs YAML vs CSV vs TOON on Claude, Gemini and GPT

The same 20-row product table (7 fields) written in 8 formats and counted on four tokenizers: Claude Opus/Sonnet 5.5, Claude Haiku 4.5, Gemini 3.x and OpenAI `o200k_base` (GPT-4o and later).

**Headline:** the table costs 1,336 GPT tokens as indented JSON and 429 as CSV (68% fewer). CSV was the cheapest format on every tokenizer tested; TOON came close but did not beat it; XML was the most expensive.

- Source page, chart and method: https://tokensave.app/data/token-cost-by-format
- Related: token cost by language on Claude, Gemini and GPT: https://tokensave.app/data/token-cost-by-language-claude-gemini
- DOI (Zenodo): [10.5281/zenodo.23435788](https://doi.org/10.5281/zenodo.23435788)
- Measured: 2026-10-17
- License: CC BY 4.0

## Key findings

- Switching from indented JSON to CSV cuts tokens by 68% on GPT, 66% on Claude 5.5 and 70% on Gemini.
- TOON needs 10% more tokens than CSV on GPT and 4% more on Claude 5.5.
- Minifying JSON saves 51% on Gemini and 43% on GPT but only 34% on Claude 5.5.
- Claude 5.5 needs 28% to 59% more tokens than GPT for the same data (largest gap: minified JSON).

## Files

- `token-cost-by-format.csv`: one row per format with character count, tokens and difference vs indented JSON for `claude55`, `claude45`, `gemini`, `gpt`
- `token-cost-by-format.json`: the same results plus all 8 input files verbatim, so every count can be reproduced

## Data

Tokens for the same table, difference versus indented JSON on the same tokenizer in brackets.

| Format | Claude Opus/Sonnet 5.5 | Claude Haiku 4.5 | Gemini 3.x | GPT o200k |
|---|---:|---:|---:|---:|
| TSV | 621 (-66%) | 477 (-71%) | 483 (-70%) | 427 (-68%) |
| CSV | 620 (-66%) | 476 (-71%) | 482 (-70%) | 429 (-68%) |
| TOON | 647 (-65%) | 502 (-69%) | 508 (-69%) | 474 (-65%) |
| Markdown table | 800 (-57%) | 649 (-60%) | 590 (-64%) | 539 (-60%) |
| JSON (minified) | 1,210 (-34%) | 847 (-48%) | 791 (-51%) | 763 (-43%) |
| YAML | 1,275 (-31%) | 1,074 (-34%) | 1,076 (-34%) | 997 (-25%) |
| JSON (indented) | 1,841 (±0%) | 1,618 (±0%) | 1,623 (±0%) | 1,336 (±0%) |
| XML | 2,200 (+20%) | 1,868 (+15%) | 1,873 (+15%) | 1,603 (+20%) |

## Method

1. One table of 20 products x 7 fields (id, name, category, price, in_stock, rating, tags), written as indented JSON (2 spaces), minified JSON, YAML, XML, CSV, TSV, a Markdown table and TOON (tabular form, tags joined with |).
2. Claude: each file sent through Claude Code (`claude -p`) with a fixed one-line system prompt; reported input tokens minus the same run with a one-character message. Opus 5.5 and Sonnet 5.5 gave identical counts.
3. Gemini: Google AI Studio prompt token counter on Gemini 3.8 Flash, minus its one start token. XML, CSV and indented JSON were measured twice; CSV and JSON matched, and the XML value is from the second run.
4. GPT: [tiktoken](https://github.com/openai/tiktoken) with `o200k_base`.

## Limitations

- One flat table. Deeply nested data does not fit CSV well; there JSON or YAML may be the practical choice.
- Token count only: models may read some formats more reliably than others.
- Claude values can be off by about ±2 tokens (under 1% here).

## Citation

TokenSave (2026). Token cost by data format: JSON vs YAML vs CSV vs TOON on Claude, Gemini and GPT [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23435788

```bibtex
@misc{tokensave2026format,
  title  = {Token cost by data format: JSON vs YAML vs CSV vs TOON on Claude, Gemini and GPT},
  author = {TokenSave},
  year   = {2026},
  publisher = {Zenodo},
  doi    = {10.5281/zenodo.23435788},
  url    = {https://tokensave.app/data/token-cost-by-format},
  note   = {Data set, CC BY 4.0}
}
```

Count tokens for your own data at [tokensave.app](https://tokensave.app/).
