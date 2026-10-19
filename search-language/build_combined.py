import json, sys, os
sys.path.insert(0, os.path.dirname(__file__) or '.')
from parse import parse, parse_codex, script_of
from pagelang import page_lang
from urllib.parse import urlparse
d9 = json.load(open('../agentsearch/combined.json'))
sec9 = {(r['tool'], r['question'], r['run']): r['seconds'] for r in d9['rows'] if r['search'] == 'on'}
QT = {'q1_fact': 'Simple fact', 'q2_news': 'Recent news', 'q3_compare': 'Price comparison', 'q4_geo': 'Research question',
      'l1_fare': 'Local fact: metro fare', 'l2_news': 'Local news', 'l3_food': 'Local restaurants'}
COUNTRY = {'ko': 'South Korea', 'ja': 'Japan', 'es': 'Spain', 'uk': 'Ukraine'}
qs_ai = json.load(open('raw/questions.json', encoding='utf-8-sig'))
qs_loc = json.load(open('localraw/local.json', encoding='utf-8-sig'))
prompts = {'ai': {'en': {q: v['prompt'] for q, v in d9['questions'].items()}}, 'local': {}}
for k, v in qs_ai.items():
    l, q = k.split('_', 1); prompts['ai'].setdefault(l, {})[q] = v
for k, v in qs_loc.items():
    a, q = k.split('_', 1); prompts['local'].setdefault(a, {})[q] = v
def secs(path):
    return int(open(path, encoding='utf-8-sig').read().strip())
rows = []
def add(tool, topic, ask, country, q, run, p, seconds):
    ql = [script_of(x) for x in p['search_queries']]
    topic_lang = country if topic == 'local' else None
    cl = [page_lang(u) for u in p['cited_urls']]
    rows.append(dict(tool=tool, topic=topic, ask_language=ask, topic_country=COUNTRY.get(country) if topic == 'local' else None, question=q, question_type=QT[q], run=run,
        input_tokens=p['input_tokens'], output_tokens=p['output_tokens'], search_queries_count=len(ql),
        queries_in_english=sum(1 for x in ql if x == 'en'), queries_in_ask_language=sum(1 for x in ql if x == ask),
        queries_in_topic_language=(sum(1 for x in ql if x == topic_lang) if topic_lang else None),
        page_opens=p['page_opens'], seconds=seconds, cited_links=len(cl), cited_in_ask_language=sum(1 for x in cl if x == ask),
        cited_in_topic_language=(sum(1 for x in cl if x == topic_lang) if topic_lang else None), cited_english=sum(1 for x in cl if x == 'en'),
        cited_other_language=sum(1 for x in cl if x not in ('en', ask, topic_lang)), answer_language=p['answer_lang'],
        search_queries=p['search_queries'], domains_cited=p['domains_cited'], cited_urls=p['cited_urls'], cited_page_languages=cl))
for l in ['en', 'ko', 'ja', 'es', 'uk']:
    for q in ['q1_fact', 'q2_news', 'q3_compare', 'q4_geo']:
        for r in (1, 2):
            if l == 'en':
                add('claude_code', 'ai', l, None, q, r, parse(f'../agentsearch/claude_en_{q}_on_r{r}/run.jsonl', l), sec9[('claude_code', q, r)])
                add('codex', 'ai', l, None, q, r, parse_codex(f'../agentsearch/codex_en_{q}_on_r{r}/run.jsonl', l), sec9[('codex', q, r)])
            else:
                add('claude_code', 'ai', l, None, q, r, parse(f'raw/claude_{l}_{q}_on_r{r}/run.jsonl', l), secs(f'raw/claude_{l}_{q}_on_r{r}/seconds.txt'))
                add('codex', 'ai', l, None, q, r, parse_codex(f'codexraw/codex_{l}_{q}_on_r{r}/run.jsonl', l), secs(f'codexraw/codex_{l}_{q}_on_r{r}/seconds.txt'))
for k in qs_loc:
    a, q = k.split('_', 1); ask = 'en' if a.startswith('en-') else a; country = a.split('-')[-1]
    for r in range(1, 6):
        for tool, pre, fn in (('claude_code', 'claude', parse), ('codex', 'codex', parse_codex)):
            d = f'localraw/{pre}_{k}_r{r}'
            if os.path.exists(d + '/run.jsonl'):
                add(tool, 'local', ask, country, q, r, fn(d + '/run.jsonl', ask), secs(d + '/seconds.txt'))
json.dump(dict(measured='2026-10-18 (local topics: runs 3-5 for Claude Code and all Codex runs added 2026-10-19)', tools={'claude_code': 'Claude Code 2.1.295 (Opus 5.5), effort medium, WebSearch and WebFetch only',
               'codex': 'Codex CLI 0.162 (gpt-6-luna), effort medium, codex --search exec'}, question_types=QT, prompts=prompts, rows=rows),
          open('combined.json', 'w'), ensure_ascii=False, indent=1)
print(len(rows))
