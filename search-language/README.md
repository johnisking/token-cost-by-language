# Claude web search by language: search queries, cited sources and tokens in 5 languages

The same four questions asked in English, Korean, Japanese, Spanish and Ukrainian in Claude Code with web search on, two runs each: the language of every search query, the links cited and their language, the answer language, input and output tokens, searches, page opens and time.

**Headline:** asked in Korean, Japanese, Spanish or Ukrainian, Claude Code ran 64 of its 65 web searches in English, and none of the 139 links it cited was a page in the question's language. Every answer came back in the language of the question.

- Source page, chart and method: https://tokensave.app/data/claude-web-search-by-language
- Related: web search in Claude Code and Codex ([`../search/`](../search/), https://tokensave.app/data/ai-agent-web-search-tokens)
- DOI (Zenodo): [10.5281/zenodo.23451506](https://doi.org/10.5281/zenodo.23451506)
- Also on: [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-web-search-by-language) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-web-search-by-language)
- Measured: 2026-10-18
- License: CC BY 4.0

## Key findings

- Claude searches in English, whatever language you ask in: 64 of 65 searches for non-English questions were in English. The only exception was one Korean query run alongside an English one for the Korean research question. For the price question every language produced the identical query "Claude Pro plan price per month US".
- The sources stay English: none of the 139 links cited in the 32 non-English answers was a page in the question's language. The one non-English page cited anywhere was a Spanish Euronews article, in a Ukrainian answer and an English one.
- The answer still comes back in your language: all 40 answers were in the language of the question, and every price answer gave the correct $20 a month.
- The same query did not lead to the same sources: for the price question, answers cited Anthropic's own pricing pages in 2 of 2 English, Korean and Japanese runs, 0 of 2 Spanish and 1 of 2 Ukrainian runs.
- Language barely changes the token count; the run does: with one identical search the price question cost 122,171 input tokens in English and 122,777 to 124,766 in the other languages (up to 2% more). The research question ranged from 138,821 to 838,383 input tokens across runs.
- For prices Claude skipped search entirely and opened the official pricing pages directly, in every language and run.

## Files

- `claude-web-search-by-language.csv`: one row per run with `language, question, question_type, run, input_tokens, output_tokens, helper_model_input_tokens, searches, searches_in_english, searches_in_question_language, page_opens, seconds, cited_links, cited_in_question_language, cited_other_language, answer_language, fact_answer_20_usd, cited_official_page, search_queries, domains_cited`
- `claude-web-search-by-language.json`: the same data plus the exact prompts in each language and every cited URL

## Per question language (4 questions × 2 runs)

| Question language | Searches in English | Cited links in the question's language | Answers in the question's language | Input tokens (avg) | Output tokens (avg) | Time (avg) |
|---|---:|---:|---:|---:|---:|---:|
| English | 14 / 14 | 28 / 29 | 8 / 8 | 220,363 | 8,182 | 50 s |
| Korean | 16 / 17 | 0 / 30 | 8 / 8 | 245,421 | 9,078 | 51 s |
| Japanese | 16 / 16 | 0 / 37 | 8 / 8 | 264,318 | 8,200 | 54 s |
| Spanish | 15 / 15 | 0 / 33 | 8 / 8 | 166,456 | 7,367 | 40 s |
| Ukrainian | 17 / 17 | 0 / 39 | 8 / 8 | 279,189 | 8,122 | 55 s |

## Input tokens per question and language (average of 2 runs)

| Question | English | Korean | Japanese | Spanish | Ukrainian |
|---|---:|---:|---:|---:|---:|
| Simple fact | 150,414 | 122,874 | 122,884 | 124,492 | 124,684 |
| Recent news | 180,111 | 246,168 | 219,678 | 212,642 | 227,292 |
| Price comparison | 178,710 | 243,225 | 183,234 | 175,150 | 186,673 |
| Research question | 372,216 | 369,418 | 531,476 | 153,538 | 578,108 |

## Questions

- **English:** "What is the current monthly price of the Claude Pro plan in the United States? Answer in one sentence and cite your source." · "Summarize the three most important AI model releases announced in the past 7 days, one sentence each, with a source link for each." · "Compare the current API prices per million input and output tokens of the flagship models from Anthropic, OpenAI and Google. Use official pricing pages and cite them." · "How many more tokens does Korean text need than the same English text on OpenAI and Claude tokenizers? Give numbers and cite your sources."
- **Korean:** "미국에서 Claude Pro 요금제의 현재 월 가격은 얼마인가요? 한 문장으로 답하고 출처를 밝혀 주세요." · "지난 7일 동안 발표된 가장 중요한 AI 모델 출시 3가지를 각각 한 문장으로 요약하고, 각각 출처 링크를 붙여 주세요." · "Anthropic, OpenAI, Google의 대표 모델 API 가격(입력·출력 100만 토큰당)을 현재 기준으로 비교해 주세요. 공식 가격 페이지를 근거로 출처를 밝혀 주세요." · "같은 내용의 한국어 글은 영어보다 OpenAI와 Claude 토크나이저에서 토큰이 얼마나 더 필요한가요? 수치와 출처를 알려 주세요."
- **Japanese:** "米国における Claude Pro プランの現在の月額料金はいくらですか？一文で答え、出典を示してください。" · "過去7日間に発表された最も重要なAIモデルのリリースを3つ、それぞれ一文で要約し、それぞれに出典リンクを付けてください。" · "Anthropic、OpenAI、Googleのフラッグシップモデルの現在のAPI料金（入力・出力100万トークンあたり）を比較してください。公式の料金ページを使い、出典を示してください。" · "同じ内容の韓国語の文章は、英語と比べてOpenAIとClaudeのトークナイザーでどれくらい多くのトークンが必要ですか？数値と出典を示してください。"
- **Spanish:** "¿Cuál es el precio mensual actual del plan Claude Pro en Estados Unidos? Responde en una frase y cita tu fuente." · "Resume los tres lanzamientos de modelos de IA más importantes anunciados en los últimos 7 días, en una frase cada uno, con un enlace a la fuente para cada uno." · "Compara los precios actuales de la API por millón de tokens de entrada y de salida de los modelos insignia de Anthropic, OpenAI y Google. Usa las páginas oficiales de precios y cítalas." · "¿Cuántos tokens más necesita un texto en coreano que el mismo texto en inglés con los tokenizadores de OpenAI y Claude? Da cifras y cita tus fuentes."
- **Ukrainian:** "Яка поточна місячна ціна тарифу Claude Pro у США? Дай відповідь одним реченням і вкажи джерело." · "Коротко опиши три найважливіші релізи моделей ШІ, оголошені за останні 7 днів, по одному реченню на кожен, з посиланням на джерело для кожного." · "Порівняй поточні ціни API за мільйон вхідних і вихідних токенів флагманських моделей Anthropic, OpenAI та Google. Використай офіційні сторінки цін і посилайся на них." · "На скільки більше токенів потребує корейський текст порівняно з тим самим англійським текстом у токенізаторах OpenAI та Claude? Наведи цифри та вкажи джерела."

## Method

1. Claude Code 2.1.295 (Opus 5.5, Max plan) on one Windows laptop, effort medium: `claude -p --output-format stream-json --verbose --allowedTools WebSearch WebFetch`, no MCP servers, each run in its own empty folder, prompt sent through standard input.
2. The English runs are the Claude Code runs of the web search dataset in `../search/`, measured the same day with the same settings.
3. Search language: the script of each WebSearch query (Hangul, Japanese, Cyrillic, Spanish words) or English. Cited links: every URL in the final answer; the language of each cited page was checked by hand.
4. Input tokens are summed over every model in the run, including cache reads and the helper model.

## Limitations

- One tool, four questions, two runs per language, on one day; search results and the model's choices change over time.
- The questions are about AI products, where English sources dominate; local topics may behave differently.
- The research question asks about Korean in every language, which may favour Korean sources for the Korean run.

## Citation

TokenSave (2026). Claude web search by language: search queries, cited sources and tokens in 5 languages [Data set]. Zenodo. https://doi.org/10.5281/zenodo.23451506

Check your own Claude Code usage at [tokensave.app](https://tokensave.app/claude-code-usage).
