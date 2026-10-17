# Token cost by language on Claude, Gemini and GPT: 41 languages measured

The same everyday prompt in 41 languages, counted on four tokenizers: Claude Opus/Sonnet 5.5, Claude Haiku 4.5, Gemini 3.x and OpenAI `o200k_base` (GPT-4o and later).

**Headline:** the same Korean prompt needs 89 tokens on Claude Opus/Sonnet 5.5, 49 on GPT and 48 on Gemini. Across the 40 non-English languages, the median extra cost versus English is +41% on Gemini, +52% on GPT and +88% on Claude 5.5. The widest gap is Kannada: +577% on Claude 5.5 against +71% on Gemini.

- Source page, chart and method: https://tokensave.app/data/token-cost-by-language-claude-gemini
- Companion GPT dataset (with cl100k_base): https://tokensave.app/data/token-cost-by-language (DOI [10.5281/zenodo.23427148](https://doi.org/10.5281/zenodo.23427148))
- DOI (Zenodo): [10.5281/zenodo.23428350](https://doi.org/10.5281/zenodo.23428350)
- Measured: 2026-10-17
- License: CC BY 4.0

## Key findings

- English itself costs more on Claude 5.5: 47 tokens, against 35 on Claude Haiku 4.5 and 34 on both GPT and Gemini.
- Claude's newer tokenizer changed Latin-script text only. Compared with Haiku 4.5, Claude 5.5 needs 34% more tokens for English and more for all 20 Latin-script languages, while the other 21 languages (Korean, Japanese, Chinese, Cyrillic, Arabic, Hebrew, Greek, Thai, Indic) have exactly the same counts.
- Claude Opus 5.5 and Sonnet 5.5 gave identical counts for all 41 languages. Gemini 3.8 Flash and Gemini 3.1 Pro matched on every language re-checked.

## Files

- `token-cost-by-language-claude-gemini.csv`: one row per language with tokens and difference vs English for `claude55`, `claude45`, `gemini`, `gpt`, plus the translated prompt
- `token-cost-by-language-claude-gemini.json`: the same data plus metadata

## Data

Tokens for the same prompt, difference versus English in brackets.

| Language | Claude Opus/Sonnet 5.5 | Claude Haiku 4.5 | Gemini 3.x | GPT o200k |
|---|---:|---:|---:|---:|
| English | 47 (±0%) | 35 (±0%) | 34 (±0%) | 34 (±0%) |
| Chinese (Simplified) | 54 (+15%) | 54 (+54%) | 34 (±0%) | 35 (+3%) |
| Chinese (Traditional) | 60 (+28%) | 60 (+71%) | 38 (+12%) | 46 (+35%) |
| Swedish | 67 (+43%) | 51 (+46%) | 47 (+38%) | 45 (+32%) |
| Spanish | 69 (+47%) | 49 (+40%) | 38 (+12%) | 40 (+18%) |
| Portuguese | 69 (+47%) | 54 (+54%) | 43 (+26%) | 41 (+21%) |
| Norwegian | 69 (+47%) | 55 (+57%) | 48 (+41%) | 45 (+32%) |
| French | 70 (+49%) | 59 (+69%) | 48 (+41%) | 44 (+29%) |
| Russian | 71 (+51%) | 71 (+103%) | 43 (+26%) | 45 (+32%) |
| Japanese | 71 (+51%) | 71 (+103%) | 46 (+35%) | 61 (+79%) |
| Danish | 71 (+51%) | 56 (+60%) | 47 (+38%) | 46 (+35%) |
| Romanian | 74 (+57%) | 59 (+69%) | 52 (+53%) | 52 (+53%) |
| Italian | 78 (+66%) | 57 (+63%) | 47 (+38%) | 47 (+38%) |
| Indonesian | 80 (+70%) | 56 (+60%) | 37 (+9%) | 39 (+15%) |
| Ukrainian | 80 (+70%) | 80 (+129%) | 59 (+74%) | 64 (+88%) |
| Dutch | 81 (+72%) | 61 (+74%) | 50 (+47%) | 44 (+29%) |
| Filipino | 84 (+79%) | 60 (+71%) | 53 (+56%) | 52 (+53%) |
| Hebrew | 86 (+83%) | 86 (+146%) | 61 (+79%) | 53 (+56%) |
| Czech | 86 (+83%) | 70 (+100%) | 63 (+85%) | 68 (+100%) |
| Vietnamese | 88 (+87%) | 82 (+134%) | 43 (+26%) | 46 (+35%) |
| Hungarian | 88 (+87%) | 69 (+97%) | 64 (+88%) | 59 (+74%) |
| Arabic | 89 (+89%) | 89 (+154%) | 48 (+41%) | 43 (+26%) |
| Korean | 89 (+89%) | 89 (+154%) | 48 (+41%) | 49 (+44%) |
| Turkish | 90 (+91%) | 72 (+106%) | 46 (+35%) | 50 (+47%) |
| Slovak | 91 (+94%) | 73 (+109%) | 65 (+91%) | 68 (+100%) |
| Persian | 92 (+96%) | 92 (+163%) | 39 (+15%) | 42 (+24%) |
| Polish | 94 (+100%) | 73 (+109%) | 58 (+71%) | 64 (+88%) |
| German | 95 (+102%) | 67 (+91%) | 46 (+35%) | 43 (+26%) |
| Finnish | 96 (+104%) | 70 (+100%) | 59 (+74%) | 49 (+44%) |
| Hindi | 110 (+134%) | 110 (+214%) | 41 (+21%) | 51 (+50%) |
| Urdu | 116 (+147%) | 116 (+231%) | 48 (+41%) | 54 (+59%) |
| Greek | 117 (+149%) | 117 (+234%) | 69 (+103%) | 70 (+106%) |
| Thai | 119 (+153%) | 119 (+240%) | 46 (+35%) | 59 (+74%) |
| Marathi | 124 (+164%) | 124 (+254%) | 42 (+24%) | 56 (+65%) |
| Bengali | 142 (+202%) | 142 (+306%) | 39 (+15%) | 57 (+68%) |
| Gujarati | 142 (+202%) | 142 (+306%) | 56 (+65%) | 54 (+59%) |
| Telugu | 158 (+236%) | 158 (+351%) | 63 (+85%) | 69 (+103%) |
| Tamil | 176 (+274%) | 176 (+403%) | 52 (+53%) | 67 (+97%) |
| Malayalam | 212 (+351%) | 212 (+506%) | 65 (+91%) | 63 (+85%) |
| Punjabi | 316 (+572%) | 316 (+803%) | 86 (+153%) | 83 (+144%) |
| Kannada | 318 (+577%) | 318 (+809%) | 58 (+71%) | 61 (+79%) |

## Method

1. Same prompt and translations as the companion GPT dataset: "Please summarize the customer email below in three bullet points and suggest a polite reply. The customer says the order arrived two days late and one item was missing from the box."
2. Claude: each prompt sent through Claude Code (`claude -p`) with a fixed one-line system prompt; reported input tokens (uncached + cache read + cache write) minus the same run with a one-character message. Re-running with a different system prompt, baseline character and order gave identical counts.
3. Gemini: Google AI Studio prompt token counter, minus its one start token ("a" shows 2, "a a a" shows 4). Measured on Gemini 3.8 Flash, re-checked on Gemini 3.1 Pro.
4. GPT: [tiktoken](https://github.com/openai/tiktoken) with `o200k_base`.
5. "vs English" = tokens in the language ÷ English tokens on the same tokenizer − 1, rounded to a whole percent.

## Limitations

- One prompt. With other text the ratios move by roughly ±10–20 percentage points; the ranking is more stable than the exact numbers.
- Claude counts come from usage reports rather than a count endpoint, so each value can be off by about ±2 tokens.
- Input text only; output length is not measured. Prices differ by model, so more tokens does not always mean a higher bill.

## Citation

TokenSave (2026). Token cost by language on Claude, Gemini and GPT: 41 languages measured [Data set]. https://tokensave.app/data/token-cost-by-language-claude-gemini

```bibtex
@misc{tokensave2026tokencostmulti,
  title  = {Token cost by language on Claude, Gemini and GPT: 41 languages measured},
  author = {TokenSave},
  year   = {2026},
  url    = {https://tokensave.app/data/token-cost-by-language-claude-gemini},
  note   = {Data set, CC BY 4.0}
}
```

Count tokens for your own text at [tokensave.app](https://tokensave.app/).
