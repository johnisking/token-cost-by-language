# Text as images (pxpipe) on Claude: tokens vs exact values

Measured 2026-10-21 by TokenSave. Page, method, findings and limitations: https://tokensave.app/data/text-as-image-token-cost

Six documents sent to Claude Haiku 5.5, Sonnet 5.5, Opus 5.5 and Fable 5.1 through Claude Code 2.1.295, as plain text, as pxpipe-proxy 0.15.0 output (page images + factsheet) and as images only. 2 runs each, 144 calls.

Files:
- `text-as-image-token-cost.csv` / `.json`: one row per call (input tokens over the question-only baseline, correct / wrong / null per item type), same as the site download
- `corpus.json`: the six documents with planted facts; `questions.json`: items and expected answers
- `renders/`: the PNG pages pxpipe produced (`spaced` = Opus 5.5 profile, `dense` = Fable profile)
- `res_px_<model>.jsonl`: raw answers and usage; `scored.json`: scored rows
- `build_corpus.py`, `render.mjs`, `questions.py`, `run_px.py` (run on the PC), `score.py`

License: CC BY 4.0. Cite as: TokenSave (2026). Text as images to cut AI tokens: an independent check of pxpipe on Claude [Data set]. https://tokensave.app/data/text-as-image-token-cost
