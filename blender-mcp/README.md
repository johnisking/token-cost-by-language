# Blender MCP token cost: 72 Claude Code runs, from a table and chairs to a racing scene

Measured 2026-10-22 with Claude Code 2.1.295 (Opus 5.5, effort medium) on Windows 11, Blender 5.2.2 LTS and MCP for Blender (`uvx mcp-for-blender`, add-on 1.8). 8 tasks, 72 runs, with and without the tokensave-mcp-diet 0.3 proxy. License: CC BY 4.0.

Page with tables, chart and method: https://tokensave.app/data/blender-mcp-token-cost
Proxy used in the "diet" runs: https://github.com/johnisking/tokensave-mcp-diet (MIT)

## Key numbers

- Everyday tasks (describe a scene, build a table and four chairs, recolour the chairs and check with a screenshot, look from four sides): $0.16 to $0.23 per task at Opus 5.5 API prices; the largest text result in 25 runs was 2,347 characters.
- Racing scene (low-poly car of its own design, a circuit with a corner, 5-second chase-camera animation): $0.471 on average over 5 runs ($0.42 to $0.56); $0.445 with the proxy (within run-to-run noise).
- Printing every property of 580 objects: the script returned 122,373 characters, Claude Code refused it, Claude re-ran it in four ~32,000-character chunks: 242,782 input tokens, $0.873. With the proxy: 67,965 tokens, $0.166 (-81%).
- Every run passed its check, read back from the saved .blend file.

## Files

- `blender-mcp-token-cost.csv`: one row per run (mode, task, run, input/output tokens, API cost, requests, seconds, tool calls, largest text result, images, estimated image tokens, user_prompt characters, refused as too large, passed check, task label, calls).
- `blender-mcp-token-cost.json`: the same with setup and per-image sizes.
- `blender-mcp-token-cost-chart.png`
- Logs, scene generator and run scripts on GitHub: https://github.com/johnisking/token-cost-by-language/tree/main/blender-mcp

Image tokens are estimated as width x height / 750; input totals are exact. Only Claude Code was measured.

Cite: TokenSave (2026). Blender MCP token cost: 72 Claude Code runs, from a table and chairs to a racing scene [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23562484
