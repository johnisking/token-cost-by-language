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
