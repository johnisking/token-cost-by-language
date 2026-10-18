# PDF token cost per page: Claude vs Gemini, and PDF vs pasted text

Input tokens for text, table and scanned PDF pages (1 to 10 pages) on Claude Opus/Sonnet 5.5, Claude Haiku 4.5 and Gemini 3.x, compared with pasting the same content as text.

**Headline:** one page of text costs 2,347 tokens as a PDF on Claude 5.5 but 728 when the same text is pasted (69% less). Gemini charges a flat ~560 tokens per PDF page whatever is on it.

- Source page, chart and method: https://tokensave.app/data/pdf-token-cost
- Related: image token cost by resolution (https://tokensave.app/data/image-token-cost)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Claude reads each PDF page as text and as an image. A text page costs 2,347 tokens on Claude 5.5; a scanned page with no text layer costs 1,600 (the image part alone).
- Pasting text is much cheaper on Claude: 728 tokens instead of 2,347 for the same page.
- Gemini charges a flat rate: text, table and scanned pages all cost 561 tokens; 10 pages cost 5,601.
- On Gemini a PDF can beat pasting: the table page costs 561 tokens as a PDF and 777 pasted as CSV (28% less as a PDF).
- Cost grows in a straight line with pages: 10 text pages cost 23,236 tokens on Claude 5.5.

## Files

- `pdf-token-cost.csv`: one row per input with `input, label, kind, pages`, tokens for `claude55`, `claude45`, `gemini`, `gpt` (pasted text only) and per-page values
- `pdf-token-cost.json`: the same data plus the pasted text used

## Data

| Input | Claude Opus/Sonnet 5.5 | Claude Haiku 4.5 | Gemini 3.x | GPT (o200k) |
|---|---:|---:|---:|---:|
| PDF, text, 1 page | 2,347 | 2,115 | 561 | – |
| PDF, text, 5 pages | 11,631 | 10,499 | 2,801 | – |
| PDF, text, 10 pages | 23,236 | 20,979 | 5,601 | – |
| PDF, table, 1 page | 2,481 | 2,278 | 561 | – |
| PDF, scanned image, 1 page | 1,600 | 1,592 | 561 | – |
| Same page pasted as text | 728 | 503 | 455 | 461 |
| Same table pasted as CSV text | 913 | 720 | 777 | 629 |

## Method

1. A4 PDFs made with ReportLab: one page of English prose (about 420 words), the same page repeated to 5 and 10 pages, a page with a 35-row table, and a scanned version of the text page (150 dpi image, no text layer).
2. Claude: each PDF sent through Claude Code (`claude -p`, stream-json input) as a document block with a one-character message; input tokens minus the same run without the PDF. Opus 5.5 and Sonnet 5.5 gave identical counts.
3. Gemini: per-file token count shown by Google AI Studio for Gemini 3.8 Flash. Pasted text: prompt counter minus its one start token.
4. GPT: OpenAI bills PDF input as extracted text plus page images, which could not be reproduced without the API, so GPT is given for pasted text only (tiktoken, `o200k_base`).

## Limitations

- One page design. Denser pages, small fonts or many images will cost more on Claude.
- Default settings; Gemini's media resolution option changes its per-page count.
- Input tokens only; price per token differs by model.

## Citation

TokenSave (2026). PDF token cost per page: Claude vs Gemini, and PDF vs pasted text [Data set]. https://tokensave.app/data/pdf-token-cost

Count tokens for your own text at [tokensave.app](https://tokensave.app/).
