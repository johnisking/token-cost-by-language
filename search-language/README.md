# AI web search by language: what Claude Code and Codex search for, and cite, in 5 languages

Claude Code and Codex answering the same questions in English, Korean, Japanese, Spanish and Ukrainian with web search on, plus local-topic questions about Seoul, Tokyo, Madrid and Kyiv asked in the local language and in English: the language of every search query, every cited link and its language, the answer language, tokens, searches and time. Version 2 (128 runs).

**Headline:** asked about AI in Korean, Japanese, Spanish or Ukrainian, Claude Code and Codex ran 205 of their 206 searches in English and cited no pages in the question's language. Asked about Seoul, Tokyo, Madrid or Kyiv in the local language, Claude Code searched in that language 84% of the time. Every answer came back in the language of the question.

- Source page, chart and method: https://tokensave.app/data/claude-web-search-by-language
- Related: web search in Claude Code and Codex ([`../search/`](../search/), https://tokensave.app/data/ai-agent-web-search-tokens)
- DOI (Zenodo): [10.5281/zenodo.23451506](https://doi.org/10.5281/zenodo.23451506)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-web-search-by-language) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-web-search-by-language)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- For a global topic, both agents search in English: asked about AI products in Korean, Japanese, Spanish or Ukrainian, Claude Code wrote 64 of 65 queries in English and Codex all 141.
- So the sources stay English: none of the 139 links Claude Code cited and none of the 83 Codex cited was a page in the question's language.
- For a local topic, the search follows the country: asked in the local language about metro fares, the week's news and restaurants, Claude Code searched in that language 53 of 63 times, and 79 of 94 cited links were local-language pages.
- Even an English question about a local topic pulls in local sources: 33 of 67 searches were in the country's language (every query for the Madrid metro fare was in Spanish), and 42 of 95 cited links were local-language pages.
- Ukrainian news was the exception: asked in Ukrainian, Claude Code cited English-language outlets (NPR, Al Jazeera, CNN) for 7 of 11 links.
- All 128 answers were written in the language of the question.
- Language barely changes the token count; Codex used about 72,000 to 82,000 input tokens per answer and Claude Code about 166,000 to 279,000.

## Files

- `claude-web-search-by-language.csv`: one row per run with `tool, topic, ask_language, topic_country, question, question_type, run, input_tokens, output_tokens, search_queries_count, queries_in_english, queries_in_ask_language, queries_in_topic_language, page_opens, seconds, cited_links, cited_in_ask_language, cited_in_topic_language, cited_english, cited_other_language, answer_language, search_queries, domains_cited`
- `claude-web-search-by-language.json`: the same data plus every prompt, every cited URL and the language of each cited page

## AI topic: search language and sources (4 questions × 2 runs)

| Question language | Tool | Queries in English | Cited links in the question's language | Input tokens (avg) |
|---|---|---:|---:|---:|
| English | Claude Code | 14 / 14 | 28 / 29 | 220,363 |
| English | Codex | 40 / 40 | 21 / 21 | 71,547 |
| Korean | Claude Code | 16 / 17 | 0 / 30 | 245,421 |
| Korean | Codex | 30 / 30 | 0 / 22 | 81,625 |
| Japanese | Claude Code | 16 / 16 | 0 / 37 | 264,318 |
| Japanese | Codex | 37 / 37 | 0 / 20 | 73,073 |
| Spanish | Claude Code | 15 / 15 | 0 / 33 | 166,456 |
| Spanish | Codex | 31 / 31 | 0 / 19 | 80,666 |
| Ukrainian | Claude Code | 17 / 17 | 0 / 39 | 279,189 |
| Ukrainian | Codex | 43 / 43 | 0 / 22 | 79,978 |

## Local topics (Claude Code, 3 questions × 2 runs)

| Topic country | Asked in | Queries in the country's language | Cited links in the country's language | Cited English pages | Input tokens (avg) |
|---|---|---:|---:|---:|---:|
| South Korea | Korean | 14 / 17 | 18 / 18 | 0 | 200,570 |
| South Korea | English | 7 / 19 | 9 / 23 | 13 | 190,343 |
| Japan | Japanese | 22 / 24 | 28 / 31 | 0 | 251,767 |
| Japan | English | 7 / 17 | 4 / 24 | 20 | 201,251 |
| Spain | Spanish | 11 / 12 | 23 / 24 | 1 | 158,518 |
| Spain | English | 11 / 16 | 19 / 23 | 4 | 239,644 |
| Ukraine | Ukrainian | 6 / 10 | 10 / 21 | 10 | 145,656 |
| Ukraine | English | 8 / 15 | 10 / 25 | 14 | 158,498 |

## Method

1. Both tools on one Windows laptop, effort medium, each run in its own empty folder, prompt sent through standard input.
2. Claude Code 2.1.295 (Opus 5.5, Max plan): `claude -p --output-format stream-json --verbose --allowedTools WebSearch WebFetch`, no MCP servers.
3. Codex CLI 0.162 (gpt-6-luna, ChatGPT plan): `codex --search exec --json`; every query in a search step is counted.
4. The English AI-topic runs are those of the web search dataset in `../search/`, measured the same day with the same settings.
5. Query language: script of each query (Hangul, Japanese, Cyrillic) or Spanish versus English words for Latin script. Cited links: every URL in the final answer; the language of each cited page was checked by hand from its address and title.

## Limitations

- Two tools, two runs per question, on one day; search results and the models' choices change over time.
- Local topics were measured on Claude Code only, for four countries and three kinds of question.
- The AI research question asks about Korean in every language, which may favour Korean sources for the Korean run.

## Citation

TokenSave (2026). AI web search by language: what Claude Code and Codex search for, and cite, in 5 languages [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23451506

Check your own Claude Code usage at [tokensave.app](https://tokensave.app/claude-code-usage).
