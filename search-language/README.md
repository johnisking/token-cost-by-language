# AI web search by language: what Claude Code and Codex search for, and cite, in 5 languages

Claude Code and Codex answering the same questions in English, Korean, Japanese, Spanish and Ukrainian with web search on, plus local-topic questions about Seoul, Tokyo, Madrid and Kyiv asked in the local language and in English: the language of every search query, every cited link and its language, the answer language, tokens, searches and time. Version 3 (320 runs): the local-topic questions now have five runs each for both Claude Code and Codex.

**Headline:** asked about AI in Korean, Japanese, Spanish or Ukrainian, Claude Code and Codex ran 205 of their 206 searches in English and cited no pages in the question's language. Asked about Seoul, Tokyo, Madrid or Kyiv in the local language, Claude Code searched in that language 82% of the time and Codex 50%. Every answer came back in the language of the question.

- Source page, chart and method: https://tokensave.app/data/claude-web-search-by-language
- Related: web search in Claude Code and Codex (https://huggingface.co/datasets/JOHNISKING/ai-agent-web-search-tokens)
- DOI (Zenodo): [10.5281/zenodo.23451506](https://doi.org/10.5281/zenodo.23451506) (the Zenodo record also has the raw logs and the scripts)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-web-search-by-language) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-web-search-by-language)
- Measured: 2026-10-18 and 2026-10-19
- License: CC BY 4.0

## Key findings

- For a global topic, both agents search in English: asked about AI products in Korean, Japanese, Spanish or Ukrainian, Claude Code wrote 64 of 65 queries in English and Codex all 141.
- So the sources stay English: none of the 139 links Claude Code cited and none of the 83 Codex cited was a page in the question's language.
- For a local topic, Claude Code's search follows the country: asked in the local language about metro fares, the week's news and restaurants (5 runs per question), it searched in that language 138 of 168 times, and 196 of 243 cited links were local-language pages.
- Even an English question about a local topic pulls in local sources: Claude Code ran 84 of 173 searches in the country's language (every query for the Madrid metro fare was in Spanish), and 107 of 228 cited links were local-language pages.
- Codex switches far less: asked in the local language it searched in that language 117 of 232 times and cited local-language pages for 83 of 139 links; asked in English, 46 of 273 searches were in the country's language (Japan: 1 of 56). Madrid was the exception for both: asked in English, Claude Code cited Spanish pages for 42 of 53 links and Codex for 26 of 31.
- Ukrainian news was the exception: asked in Ukrainian, Claude Code cited English-language outlets (NPR, Al Jazeera, CNN) for 14 of 23 links; 15 of the 15 links Codex cited were English-language pages.
- All 320 answers were written in the language of the question.
- Language barely changes the token count; Codex used about 72,000 to 82,000 input tokens per AI-topic answer and Claude Code about 166,000 to 279,000.

## Files

- `claude-web-search-by-language.csv`: one row per run with `tool, topic, ask_language, topic_country, question, question_type, run, input_tokens, output_tokens, search_queries_count, queries_in_english, queries_in_ask_language, queries_in_topic_language, page_opens, seconds, cited_links, cited_in_ask_language, cited_in_topic_language, cited_english, cited_other_language, answer_language, search_queries, domains_cited`
- `claude-web-search-by-language.json`: the same data plus every prompt, every cited URL and the language of each cited page
- `build_combined.py`, `parse.py`, `pagelang.py`: rebuild the table from the raw logs (the raw logs are in the Zenodo record)

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

## Local topics (3 questions × 5 runs per tool)

| Topic country | Asked in | Tool | Queries in the country's language | Cited links in the country's language | Cited English pages | Input tokens (avg) |
|---|---|---|---:|---:|---:|---:|
| South Korea | Korean | Claude Code | 33 / 41 | 54 / 58 | 4 | 202,216 |
| South Korea | Korean | Codex | 32 / 72 | 17 / 41 | 24 | 69,858 |
| South Korea | English | Claude Code | 18 / 51 | 25 / 58 | 31 | 211,271 |
| South Korea | English | Codex | 13 / 90 | 6 / 38 | 32 | 77,295 |
| Japan | Japanese | Claude Code | 51 / 57 | 64 / 72 | 3 | 242,667 |
| Japan | Japanese | Codex | 24 / 56 | 19 / 31 | 12 | 56,754 |
| Japan | English | Claude Code | 21 / 42 | 20 / 59 | 39 | 190,232 |
| Japan | English | Codex | 1 / 56 | 2 / 26 | 24 | 53,304 |
| Spain | Spanish | Claude Code | 35 / 39 | 54 / 60 | 6 | 177,094 |
| Spain | Spanish | Codex | 49 / 54 | 36 / 36 | 0 | 63,381 |
| Spain | English | Claude Code | 28 / 40 | 42 / 53 | 10 | 216,743 |
| Spain | English | Codex | 29 / 79 | 26 / 31 | 5 | 70,136 |
| Ukraine | Ukrainian | Claude Code | 19 / 31 | 24 / 53 | 26 | 150,537 |
| Ukraine | Ukrainian | Codex | 12 / 50 | 11 / 31 | 19 | 55,035 |
| Ukraine | English | Claude Code | 17 / 40 | 20 / 58 | 37 | 165,768 |
| Ukraine | English | Codex | 3 / 48 | 5 / 29 | 24 | 53,171 |

## Method

1. Both tools on one Windows laptop, effort medium, each run in its own empty folder, prompt sent through standard input.
2. Claude Code 2.1.295 (Opus 5.5, Max plan): `claude -p --output-format stream-json --verbose --allowedTools WebSearch WebFetch`, no MCP servers.
3. Codex CLI 0.162 (gpt-6-luna, ChatGPT plan): `codex --search exec --json`; every query in a search step is counted.
4. The English AI-topic runs are those of the web search dataset on https://tokensave.app/data/ai-agent-web-search-tokens, measured the same day with the same settings.
5. AI-topic runs and Claude Code local-topic runs 1-2 were measured on 2026-10-18; Claude Code local-topic runs 3-5 and all Codex local-topic runs on 2026-10-19 with the same versions and settings. The news question asks about "the past 7 days", so later runs saw a different week's news.
6. Query language: script of each query (Hangul, Japanese, Cyrillic) or Spanish versus English words for Latin script. Cited links: every URL in the final answer; the language of each cited page was checked by hand from its address and title.

## Limitations

- Two runs per AI-topic question and five per local-topic question, over two days; search results and the models' choices change over time.
- Four countries and three kinds of local question; the language of each cited page was classified by hand.
- The AI research question asks about Korean in every language, which may favour Korean sources for the Korean run.

## Citation

TokenSave (2026). AI web search by language: what Claude Code and Codex search for, and cite, in 5 languages [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23451506

Check your own Claude Code usage at [tokensave.app](https://tokensave.app/claude-code-usage).
