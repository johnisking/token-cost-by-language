# Web search in Claude Code and Codex: tokens, searches and sources per question

Four kinds of question asked with web search on in Claude Code and Codex, two runs each: input and output tokens, searches and page opens, time, the sites seen in results and the sites cited in the answer, plus the same questions with no tools.

**Headline:** with web search on, a one-line fact question cost 150,414 input tokens in Claude Code and 33,296 in Codex. Across the four questions Claude Code used 150,414 to 372,216 input tokens and Codex 33,296 to 99,584.

- Source page, chart and method: https://tokensave.app/data/ai-agent-web-search-tokens
- Related: Claude Code vs Codex startup tokens (https://tokensave.app/data/claude-code-vs-codex-tokens)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Search is the expensive part of an answer: turning search on added 65% to 207% to Codex's input tokens compared with the same questions and no tools.
- Claude Code runs a second model for the web: a smaller Claude model (Haiku) processed search results and pages, 13% to 26% of Claude Code's input tokens.
- Research-style questions cost the most: 372,216 input tokens on average in Claude Code.
- Different tools look at different web: for the news question Codex's results were led by reddit.com and Claude Code's by en.wikipedia.org. For prices both cited only official pages.
- Without search both tools declined the news question. On the price question Claude Code said it answered from memory; Codex named the pricing page as its source although it had not opened it.
- Turning search off is not simple: with only the search tool blocked, Claude Code fetched pages with shell commands and Codex used other built-in tools; every tool had to be switched off for the no-search runs.

## Files

- `ai-agent-web-search-tokens.csv`: one row per run with `tool, question, question_type, search, run, input_tokens, output_tokens, helper_model_input_tokens, searches, page_opens, seconds, domains_seen_count, domains_seen_top, domains_cited`
- `ai-agent-web-search-tokens.json`: the same data plus the exact prompts

## Tokens and searches per question (search on, average of 2 runs)

| Question | Tool | Input tokens | Output tokens | Searches / page opens | Time | Input, no tools |
|---|---|---:|---:|---:|---:|---:|
| Simple fact | Claude Code (Opus 5.5) | 150,414 | 1,526 | 1.5 / 0 | 23 s | 2,985 |
| Simple fact | Codex (gpt-6-luna) | 33,296 | 108 | 1 / 0 | 10 s | 15,545 |
| Recent news | Claude Code (Opus 5.5) | 180,111 | 5,273 | 3 / 0 | 34 s | 2,982 |
| Recent news | Codex (gpt-6-luna) | 68,191 | 440 | 2 / 0 | 15 s | 41,424 |
| Price comparison | Claude Code (Opus 5.5) | 178,710 | 14,874 | 0 / 6.5 | 64 s | 2,999 |
| Price comparison | Codex (gpt-6-luna) | 99,584 | 680 | 2 / 1 | 22 s | 55,450 |
| Research question | Claude Code (Opus 5.5) | 372,216 | 11,056 | 2.5 / 6 | 80 s | 2,993 |
| Research question | Codex (gpt-6-luna) | 85,118 | 594 | 2 / 0.5 | 20 s | 27,741 |

## Sites seen and cited

| Question | Tool | Sites seen | Most seen in results | Cited in the answer |
|---|---|---:|---|---|
| Simple fact | Claude Code | 8 | support.claude.com, claude.com, morphllm.com | claude.com, support.claude.com |
| Simple fact | Codex | 2 | support.anthropic.com, anthropic.com | anthropic.com, support.anthropic.com |
| Recent news | Claude Code | 20 | en.wikipedia.org, llmgateway.io, letsdatascience.com | axios.com, blog.google, clone-systems.com, dev.to, es.euronews.com, llmgateway.io, research.meta.ai |
| Recent news | Codex | 34 | reddit.com, en.wikipedia.org, tomshardware.com | about.fb.com, artificialwatch.com, blog.google, blogs.nvidia.com, reflection.ai, themodelgap.com |
| Price comparison | Claude Code | 20 | platform.claude.com, aistudio.google.com, ai.google.dev | ai.google.dev, claude.com, developers.openai.com, platform.claude.com |
| Price comparison | Codex | 8 | ai.google.dev, developers.openai.com, anthropic.com | ai.google.dev, anthropic.com, developers.openai.com |
| Research question | Claude Code | 39 | dev.to, media2.dev.to, assets.dev.to | arxiv.org, dev.to, github.com, hiai.korea.ac.kr, jangwook.net, proceedings.neurips.cc |
| Research question | Codex | 20 | reddit.com, arxiv.org, platform.openai.com | huggingface.co, jangwook.net, platform.claude.com, platform.openai.com, zolamir.com |

## Questions

- **Simple fact:** "What is the current monthly price of the Claude Pro plan in the United States? Answer in one sentence and cite your source."
- **Recent news:** "Summarize the three most important AI model releases announced in the past 7 days, one sentence each, with a source link for each."
- **Price comparison:** "Compare the current API prices per million input and output tokens of the flagship models from Anthropic, OpenAI and Google. Use official pricing pages and cite them."
- **Research question:** "How many more tokens does Korean text need than the same English text on OpenAI and Claude tokenizers? Give numbers and cite your sources."

## Method

1. Both tools on the same Windows laptop, effort medium, each run in its own empty folder.
2. Claude Code 2.1.295 (Opus 5.5, Max plan): `claude -p --output-format stream-json --verbose --allowedTools WebSearch WebFetch`, no MCP servers; input tokens summed over every model in the run.
3. Codex CLI 0.162 (gpt-6-luna, ChatGPT plan): `codex --search exec --json`; searches and page opens are the web-search items in the log.
4. No tools: Claude Code with `--tools ""`; Codex with `-c web_search="disabled"` and apps, plugins, in-app browser and skill search disabled.

## Limitations

- Four English questions, two runs each, on one day; search results change and runs vary.
- Models and per-token prices differ and most Claude Code input is cached, so tokens are not costs.
- "No tools" also removes Claude Code's built-in tool definitions, so it is a lower bound.
- Other languages will be a separate dataset; Cursor will be added later.

## Citation

TokenSave (2026). Web search in Claude Code and Codex: tokens, searches and sources per question [Data set]. https://tokensave.app/data/ai-agent-web-search-tokens

Check your own Claude Code and Codex usage at [tokensave.app](https://tokensave.app/claude-code-usage).
