# PDF token cost per page: Claude vs Gemini, and PDF vs pasted text

**v2 (2026-10-18):** added Codex and Cursor reading the same PDFs from disk.

Input tokens for text, table and scanned PDF pages (1 to 10 pages) on Claude Opus/Sonnet 5.5, Claude Haiku 4.5 and Gemini 3.x, compared with pasting the same content as text.

**Headline:** one page of text costs 2,347 tokens as a PDF on Claude 5.5 but 728 when the same text is pasted (69% less). Gemini charges a flat ~560 tokens per PDF page whatever is on it.

- Source page, chart and method: https://tokensave.app/data/pdf-token-cost
- Related: image token cost by resolution (https://tokensave.app/data/image-token-cost)
- DOI (Zenodo): [10.5281/zenodo.23446565](https://doi.org/10.5281/zenodo.23446565)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/pdf-token-cost) · [Kaggle](https://www.kaggle.com/datasets/johnisking/pdf-token-cost-per-page-claude-vs-gemini)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Claude reads each PDF page as text and as an image. A text page costs 2,347 tokens on Claude 5.5; a scanned page with no text layer costs 1,600 (the image part alone).
- Pasting text is much cheaper on Claude: 728 tokens instead of 2,347 for the same page.
- Gemini charges a flat rate: text, table and scanned pages all cost 561 tokens; 10 pages cost 5,601.
- On Gemini a PDF can beat pasting: the table page costs 561 tokens as a PDF and 777 pasted as CSV (28% less as a PDF).
- Cost grows in a straight line with pages: 10 text pages cost 23,236 tokens on Claude 5.5.
- Coding agents spend more on working out how to open a PDF than on the PDF itself: a one-page PDF cost Codex 92,668 input tokens and Cursor 76,220, against 29,921 and 26,600 for the same text as a .txt file (+210% and +187%). Ten pages cost about the same as one.
- Scanned PDFs broke both agents: Codex used 215,837 tokens on average and said it could not read the page; Cursor answered both times with content that is not in the file.

## Files

- `pdf-token-cost.csv`: one row per input with `input, label, kind, pages`, tokens for `claude55`, `claude45`, `gemini`, `gpt` (pasted text only) and per-page values
- `pdf-token-cost-agents.csv`: Codex and Cursor reading each file from disk, with `codex_avg_input_tokens`, `codex_run1`, `codex_run2`, `codex_result` and the same columns for Cursor
- `pdf-token-cost.json`: the same data plus the pasted text used and the agent run details

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

## Coding agents: Codex and Cursor

Same files, read from disk with the prompt "Read the file … and summarize its full contents in one sentence." Each file alone in an empty folder, two runs per file. Total input tokens for the whole agent session (cached tokens and the agent's own instructions included), so not comparable with the Claude and Gemini counts above. With no file the same setup used 15,070 (Codex) and 13,022 (Cursor) tokens.

| File | Codex (gpt-6-luna) | Cursor (free, Auto) |
|---|---:|---:|
| Same page as a .txt file | 29,921 | 26,600 |
| PDF, text, 1 page | 92,668 | 76,220 |
| PDF, text, 5 pages | 74,710 | 78,624 |
| PDF, text, 10 pages | 114,776 | 81,750 |
| Same table as a .csv file | 30,105 (1 of 2 runs failed) | 28,560 |
| PDF, table, 1 page | 85,710 | 76,704 |
| PDF, scanned image, 1 page | 215,837 (failed) | 84,940 (wrong answer) |

- Neither agent looked at the pages as images. Codex loaded a PDF skill, tried Python libraries that were not installed, then used `pdftotext`. Cursor read a PDF skill file, then its built-in file reader returned the text layer.
- Codex varies a lot: the same 10-page PDF took 49,273 tokens once and 180,278 the next time. Cursor's two runs were within 2% on every text and table PDF.
- The scanned page has no text layer. Codex found no OCR tool and said so. Cursor's reader returned an empty page, its shell commands were not approved in print mode, and it still answered with invented text.

## Method

1. A4 PDFs made with ReportLab: one page of English prose (about 420 words), the same page repeated to 5 and 10 pages, a page with a 35-row table, and a scanned version of the text page (150 dpi image, no text layer).
2. Claude: each PDF sent through Claude Code (`claude -p`, stream-json input) as a document block with a one-character message; input tokens minus the same run without the PDF. Opus 5.5 and Sonnet 5.5 gave identical counts.
3. Gemini: per-file token count shown by Google AI Studio for Gemini 3.8 Flash. Pasted text: prompt counter minus its one start token.
4. GPT: OpenAI bills PDF input as extracted text plus page images, which could not be reproduced without the API, so GPT is given for pasted text only (tiktoken, `o200k_base`).
5. Codex: Codex CLI 0.162 on Windows, ChatGPT plan, gpt-6-luna at low reasoning effort, `codex exec --json -s read-only`.
6. Cursor: Cursor Agent CLI on Windows, free Hobby plan, model Auto, `cursor-agent -p --output-format stream-json`, default permissions.

## Limitations

- One page design. Denser pages, small fonts or many images will cost more on Claude.
- Default settings; Gemini's media resolution option changes its per-page count.
- Input tokens only; price per token differs by model.
- Codex and Cursor: two runs per file on one machine with the tools that happened to be installed; an agent with OCR or shell access would behave differently.

## Citation

TokenSave (2026). PDF token cost per page: Claude vs Gemini, and PDF vs pasted text [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23446565

Count tokens for your own text at [tokensave.app](https://tokensave.app/).
