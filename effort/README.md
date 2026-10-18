# Claude effort levels: tokens, time and cost for the same coding task

The same coding prompt run once at each effort level in Claude Code: Claude Opus 5.5 at low, medium, high, xhigh and max, and Claude Sonnet 5.5 at medium and high.

**Headline:** the task used 6,299 output tokens and $0.56 at medium on Opus 5.5, and 160,033 tokens and $5.25 at max. High cost only 34% more than medium; the jump starts at xhigh.

- Source page, chart and method: https://tokensave.app/data/claude-effort-cost
- DOI (Zenodo): [10.5281/zenodo.23446567](https://doi.org/10.5281/zenodo.23446567)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-effort-cost) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-effort-levels-tokens-time-and-cost)
- Measured: 2026-10-09
- License: CC BY 4.0

## Key findings

- Low and medium are close: low cost 14% less ($0.48 vs $0.56) and took 32 s instead of 52 s.
- High is the best value step: output tokens rose 96% but cost only 34% more, because most of each request is unchanged input.
- Costs jump from xhigh: xhigh cost 143% more than medium and max 837% more. Max took 22 min 22 s.
- Sonnet 5.5 used 35% fewer output tokens than Opus 5.5 at the same effort and cost 55% less at medium and 60% less at high.

## Files

- `claude-effort-cost.csv`: one row per run with `model, effort, seconds, output_tokens, total_tokens, cost_usd, code_lines`
- `claude-effort-cost.json`: the same data plus the exact prompt

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

## Method

1. Prompt: "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."
2. Run once per effort level in Claude Code (`claude -p --effort …`), each in its own empty folder.
3. Tokens and cost from ccusage at API prices; time from start and end timestamps; lines counted in the finished index.html.
4. All seven games ran without errors and had every requested feature.

## Limitations

- One run per level and one task. Runs vary, especially at higher effort; treat the numbers as an order of magnitude.
- Costs are API-equivalent. On a Pro or Max plan the same runs use up the usage limit instead.
- The max run tried to run an automated test that needed permission, which added time.

## Citation

TokenSave (2026). Claude effort levels: tokens, time and cost for the same coding task [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23446567

Estimate coding agent costs at [tokensave.app](https://tokensave.app/).
