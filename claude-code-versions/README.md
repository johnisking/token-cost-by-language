# Claude Code baseline tokens by version

Measured 2026-10-21 by TokenSave. Page, method, findings and limitations: https://tokensave.app/data/claude-code-baseline-tokens-by-version

46 Claude Code versions (1.0.60, July 2025, to 2.1.306, October 2026) installed from npm on one Windows laptop and sent the prompt "a" with `claude -p` (Claude Haiku 5.5), 3 runs each with MCP off and 1 run with the account's claude.ai connectors on. The metric is the input tokens (uncached + cache read + cache write) of the first model request.

Files:
- `claude-code-baseline-tokens-by-version.csv` / `.json`: one row per version and setting (same as the site download)
- `combined.json`: the same rows as built from the PC results
- `raw-logs-mcp-off.zip`: stream-json logs of every MCP-off run (PC user name replaced by USER). Connector-on logs are not published because tool names identify the apps connected to our account; the CSV has their counts.
- `measure_versions.py` (run on the PC), `first_call.py`, `make_public.py`, `build_combined.py`, `chart.py`, `npm_times.json` (npm publish dates)

License: CC BY 4.0. Cite as: TokenSave (2026). Claude Code baseline tokens by version: what every request carries before you type [Data set]. https://tokensave.app/data/claude-code-baseline-tokens-by-version
