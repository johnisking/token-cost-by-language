# Image input token cost by resolution: Claude vs Gemini vs GPT

Input tokens for one image at 10 resolutions (256×256 to a 12 MP photo) on Claude Opus/Sonnet 5.5, Claude Haiku 4.5, Gemini 3.x and GPT.

**Headline:** a 12-megapixel phone photo costs 1,065 input tokens on Gemini, 4,005 on Claude 5.5 and 14,364 on GPT-6 Astra with default settings. Gemini charges about the same for every image, so it is the cheapest for large pictures and the most expensive for small ones.

- Source page, chart and method: https://tokensave.app/data/image-token-cost
- Related: token cost by language (https://tokensave.app/data/token-cost-by-language-claude-gemini) and by data format (https://tokensave.app/data/token-cost-by-format)
- DOI (Zenodo): [10.5281/zenodo.23443906](https://doi.org/10.5281/zenodo.23443906)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Gemini charges a flat rate: 1,065 to 1,101 tokens per image, from a 256×256 icon to a 12 MP photo. For the photo that is 93% less than GPT-6 Astra.
- GPT-6 Astra keeps the original size by default, so a 12 MP photo costs 14,364 tokens. `detail: "high"` caps it at 2,942 (-80%).
- Claude 5.5 and Haiku 4.5 cost almost the same up to about 1 MP. Above that Claude 5.5 needs 70% more for a 1080p screenshot and 141% more for a 12 MP photo.
- Shrinking a 12 MP photo to 1024×1024 cuts its cost by 64% on Claude 5.5 and 91% on GPT-6 Astra.

## Files

- `image-token-cost.csv`: one row per image size with `size, width, height, megapixels` and tokens for `claude55`, `claude45`, `gemini`, `gpt6_auto`, `gpt6_high`, `gpt55_auto`
- `image-token-cost.json`: the same data plus column definitions

## Data

| Image size | Claude Opus/Sonnet 5.5 | Claude Haiku 4.5 | Gemini 3.x | GPT-6 Astra (default) | GPT-6 Astra (detail: high) | GPT-5.5 (default) |
|---|---:|---:|---:|---:|---:|---:|
| 256×256 | 177 | 165 | 1,090 | 77 | 77 | 77 |
| 512×512 | 438 | 426 | 1,090 | 308 | 308 | 308 |
| 768×768 | 861 | 849 | 1,090 | 692 | 692 | 692 |
| 1024×1024 | 1,446 | 1,434 | 1,090 | 1,229 | 1,229 | 1,229 |
| 1280×720 | 1,273 | 1,261 | 1,101 | 1,104 | 1,104 | 1,104 |
| 1920×1080 | 2,768 | 1,625 | 1,101 | 2,448 | 2,448 | 2,448 |
| 1080×1920 | 2,768 | 1,625 | 1,101 | 2,448 | 2,448 | 2,448 |
| 2560×1440 | 3,069 | 1,657 | 1,101 | 4,320 | 2,931 | 4,320 |
| 3840×2160 | 3,069 | 1,657 | 1,101 | 9,792 | 2,931 | 9,792 |
| 4032×3024 | 4,005 | 1,661 | 1,065 | 14,364 | 2,942 | 11,868 |

## Method

1. One synthetic PNG rendered at 10 sizes. A second image with different content gave identical counts on Claude 5.5 and Gemini, so counts depend on size, not content.
2. Claude: each image sent through Claude Code (`claude -p`, stream-json input) with a fixed system prompt and a one-character message; input tokens minus the same run without the image. Opus 5.5 and Sonnet 5.5 gave identical counts. Includes the small per-image message overhead.
3. Gemini: per-image token count shown by Google AI Studio for Gemini 3.8 Flash at the default media resolution.
4. GPT: computed with the 32×32-pixel patch formula and model limits in OpenAI's vision guide (patch count × 1.2); reproduces the guide's worked examples. Not measured through the API.

## Limitations

- Input tokens only; price per token differs by model.
- Default settings; Gemini media resolution and GPT `detail` change the counts.
- Claude counts are from Claude Code; the API may differ by a few tokens of message overhead.

## Citation

TokenSave (2026). Image input token cost by resolution: Claude vs Gemini vs GPT [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23443906

```bibtex
@misc{tokensave2026image,
  title  = {Image input token cost by resolution: Claude vs Gemini vs GPT},
  author = {TokenSave},
  year   = {2026},
  publisher = {Zenodo},
  doi    = {10.5281/zenodo.23443906},
  url    = {https://tokensave.app/data/image-token-cost},
  note   = {Data set, CC BY 4.0}
}
```

Count tokens for your own text at [tokensave.app](https://tokensave.app/).
