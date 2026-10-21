# Claude effort levels: tokens, time and cost for the same coding task

The same coding prompt run at each effort level in Claude Code: Claude Opus 5.5 at low, medium, high, xhigh and max (once each), Claude Sonnet 5.5 at medium and high (once each), and Claude Haiku 5.5 at all five levels (three runs each, added 2026-10-21).

**Headline:** the task used 6,299 output tokens and $0.56 at medium on Opus 5.5, and 160,033 tokens and $5.25 at max. High cost only 34% more than medium; the jump starts at xhigh.

- Source page, chart and method: https://tokensave.app/data/claude-effort-cost
- DOI (Zenodo): [10.5281/zenodo.23446567](https://doi.org/10.5281/zenodo.23446567)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-effort-cost) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-effort-levels-tokens-time-and-cost)
- Measured: 2026-10-09 (Opus, Sonnet), 2026-10-21 (Haiku 5.5)
- License: CC BY 4.0

## Key findings

- Low and medium are close: low cost 14% less ($0.48 vs $0.56) and took 32 s instead of 52 s.
- High is the best value step: output tokens rose 96% but cost only 34% more, because most of each request is unchanged input.
- Costs jump from xhigh: xhigh cost 143% more than medium and max 837% more. Max took 22 min 22 s.
- Sonnet 5.5 used 35% fewer output tokens than Opus 5.5 at the same effort and cost 55% less at medium and 60% less at high.
- Haiku 5.5 (average of 3 runs): $0.0095 at low, $0.0142 medium, $0.0205 high, $0.0388 xhigh, $0.38 max. Max cost 869% more than xhigh because Haiku wrote and ran its own test script (15 turns instead of 4); it was still 22% cheaper than Opus 5.5 at low.
- All 15 Haiku games passed a scripted play test (score, level 2, three lives) at every level. Higher effort wrote longer code (334 lines at low, 661 at max), not more working games.

## Files

- `claude-effort-cost.csv`: one row per run with `model, effort, run, seconds, output_tokens, total_tokens, cost_usd, code_lines`
- `claude-effort-cost.json`: the same data plus the exact prompt
- `haiku-5-5-games/`: the 15 games Haiku 5.5 wrote (`<effort>_<run>.html`), and `run_effort.py`, the script that ran them

## Data

| Model | Effort | Time | Output tokens | Total tokens | Cost (USD) | Lines of code |
|---|---|---:|---:|---:|---:|---:|
| Opus 5.5 | low | 32 s | 3,368 | 129,315 | 0.48 | 138 |
| Opus 5.5 | medium | 52 s | 6,299 | 133,428 | 0.56 | 358 |
| Opus 5.5 | high | 1 min 50 s | 12,376 | 222,854 | 0.75 | 523 |
| Opus 5.5 | xhigh | 4 min 32 s | 32,435 | 472,082 | 1.36 | 639 |
| Opus 5.5 | max | 22 min 22 s | 160,033 | 2,504,957 | 5.25 | 1,121 |
| Sonnet 5.5 | medium | 37 s | 4,100 | 115,073 | 0.25 | 198 |
| Sonnet 5.5 | high | 58 s | 8,073 | 137,593 | 0.30 | 398 |
| Haiku 5.5 | low (run 1) | 26 s | 6,020 | 82,172 | 0.0090 | 323 |
| Haiku 5.5 | low (run 2) | 39 s | 9,188 | 61,611 | 0.0087 | 364 |
| Haiku 5.5 | low (run 3) | 50 s | 11,730 | 99,717 | 0.0108 | 314 |
| Haiku 5.5 | medium (run 1) | 1 min 4 s | 14,459 | 72,134 | 0.0146 | 374 |
| Haiku 5.5 | medium (run 2) | 1 min 2 s | 15,300 | 73,803 | 0.0129 | 396 |
| Haiku 5.5 | medium (run 3) | 1 min 18 s | 18,610 | 80,368 | 0.0152 | 388 |
| Haiku 5.5 | high (run 1) | 1 min 54 s | 29,607 | 102,351 | 0.0252 | 488 |
| Haiku 5.5 | high (run 2) | 1 min 32 s | 22,271 | 131,271 | 0.0183 | 458 |
| Haiku 5.5 | high (run 3) | 1 min 29 s | 22,171 | 124,453 | 0.0181 | 492 |
| Haiku 5.5 | xhigh (run 1) | 3 min 17 s | 50,173 | 143,409 | 0.0373 | 628 |
| Haiku 5.5 | xhigh (run 2) | 3 min 12 s | 46,376 | 268,585 | 0.0359 | 574 |
| Haiku 5.5 | xhigh (run 3) | 3 min 40 s | 56,164 | 309,164 | 0.0431 | 577 |
| Haiku 5.5 | max (run 1) | 9 min 51 s | 148,195 | 2,073,976 | 0.39 | 707 |
| Haiku 5.5 | max (run 2) | 9 min 7 s | 130,973 | 2,156,518 | 0.38 | 603 |
| Haiku 5.5 | max (run 3) | 9 min 6 s | 131,693 | 1,921,233 | 0.36 | 674 |

## Method

1. Prompt: "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."
2. Run in Claude Code (`claude -p --effort …`), each in its own empty folder. Haiku 5.5: Claude Code 2.1.295, no MCP servers, three runs per level, tokens and cost from Claude Code's own usage report at list prices; each game played by a script in a headless browser.
3. Tokens and cost from ccusage at API prices; time from start and end timestamps; lines counted in the finished index.html.
4. All seven games ran without errors and had every requested feature.

## Limitations

- One run per level for Opus and Sonnet, three for Haiku, and one task. Runs vary, especially at higher effort; treat the numbers as an order of magnitude.
- Costs are API-equivalent. On a Pro or Max plan the same runs use up the usage limit instead.
- The max run tried to run an automated test that needed permission, which added time.

## Citation

TokenSave (2026). Claude effort levels: tokens, time and cost for the same coding task [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23446567

Estimate coding agent costs at [tokensave.app](https://tokensave.app/).
