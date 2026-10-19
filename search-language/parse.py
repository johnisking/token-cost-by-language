"""Parse Claude Code stream-json search runs (datasets 9 and 10)."""
import json, re, sys, os, glob
from collections import Counter
from urllib.parse import urlparse

LOCAL_TLD = {'ko': ('.kr',), 'ja': ('.jp',), 'es': ('.es', '.mx', '.ar', '.co', '.cl', '.pe'), 'uk': ('.ua',), 'en': ()}
PATH_LANG = {'ko': ('/ko/', '/ko-kr/', '/kr/', 'hl=ko', 'lang=ko'), 'ja': ('/ja/', '/ja-jp/', '/jp/', 'hl=ja'),
             'es': ('/es/', '/es-es/', '/es-419/', 'hl=es'), 'uk': ('/uk/', '/ua/', '/uk-ua/', 'hl=uk'), 'en': ()}
LOCAL_HOSTS = {'ko': ('naver.com', 'daum.net', 'tistory.com', 'velog.io', 'brunch.co.kr', 'zdnet.co.kr', 'aitimes.com', 'yna.co.kr', 'etnews.com'),
               'ja': ('qiita.com', 'zenn.dev', 'note.com', 'itmedia.co.jp', 'impress.co.jp', 'gigazine.net', 'nikkei.com', 'classmethod.jp'),
               'es': ('xataka.com', 'genbeta.com', 'elpais.com', 'hipertextual.com', 'infobae.com', 'wwwhatsnew.com'),
               'uk': ('dou.ua', 'ain.ua', 'itc.ua', 'pravda.com.ua', 'mezha.media', 'speka.media'), 'en': ()}

def host(u):
    h = urlparse(u).netloc.lower()
    return h[4:] if h.startswith('www.') else h

def is_local(u, lang):
    if lang == 'en': return False
    h = host(u); low = u.lower()
    return h.endswith(LOCAL_TLD[lang]) or any(p in low for p in PATH_LANG[lang]) or any(h == x or h.endswith('.' + x) for x in LOCAL_HOSTS[lang])

ES_W = set("precio precios billete sencillo noticias mejores mejor restaurantes restaurante ganador españa última ultima semana octubre principales alerta roja aviso rojo visita migrantes candidata elecciones ruta del de la el los las para con por cuántos coreano inglés últimos días tokenizadores modelos lanzamientos valorado premio".split())
EN_W = set("news best price the this week of in and for to restaurants restaurant visit migration where eat guide how many tokens model models release launch announced".split())

def script_of(s):
    if re.search(r'[\uac00-\ud7a3]', s): return 'ko'
    if re.search(r'[\u3040-\u30ff]', s): return 'ja'
    if re.search(r'[\u4e00-\u9fff]', s): return 'ja'
    if re.search(r'[\u0400-\u04ff]', s): return 'uk'
    w = re.findall(r"[a-záéíóúñü]+", s.lower())
    es = sum(1 for x in w if x in ES_W) + (2 if re.search(r'[áéíóúñ¿¡]', s.lower()) else 0)
    en = sum(1 for x in w if x in EN_W)
    return 'es' if es > en else 'en'


def text_lang(t):
    t = re.sub(r'https?://\S+|\]\([^)]*\)', ' ', t)
    n = dict(ko=len(re.findall(r'[\uac00-\ud7a3]', t)), ja=len(re.findall(r'[\u3040-\u30ff]', t)), uk=len(re.findall(r'[\u0400-\u04ff]', t)))
    lat = len(re.findall(r'[A-Za-z]', t))
    best = max(n, key=n.get)
    if n[best] >= 8 and n[best] >= 0.3 * lat: return best
    w = re.findall(r"[a-záéíóúñü]+", t.lower())
    es = sum(1 for x in w if x in {"de", "la", "el", "que", "los", "las", "en", "y", "con", "por", "para", "una", "es"})
    en = sum(1 for x in w if x in {"the", "and", "of", "in", "is", "for", "to", "with", "a", "on"})
    return 'es' if es > en else 'en'


def parse(path, lang):
    tus, links, result = [], [], ''
    mu = {}
    for l in open(path, encoding='utf-8', errors='replace'):
        try: j = json.loads(l)
        except Exception: continue
        t = j.get('type')
        if t == 'assistant':
            for c in j['message']['content']:
                if c.get('type') == 'tool_use': tus.append((c['name'], c['input']))
        elif t == 'user' and isinstance(j['message'].get('content'), list):
            for c in j['message']['content']:
                if c.get('type') == 'tool_result':
                    txt = c.get('content')
                    txt = json.dumps(txt) if not isinstance(txt, str) else txt
                    links += re.findall(r'"url":\s*\\?"(https?://[^"\\]+)', txt)
        elif t == 'result':
            mu = j.get('modelUsage') or {}; result = j.get('result') or ''
    inp = sum(v.get('inputTokens', 0) + v.get('cacheReadInputTokens', 0) + v.get('cacheCreationInputTokens', 0) for v in mu.values())
    out = sum(v.get('outputTokens', 0) for v in mu.values())
    helper = sum(v.get('inputTokens', 0) + v.get('cacheReadInputTokens', 0) + v.get('cacheCreationInputTokens', 0) for k, v in mu.items() if 'haiku' in k)
    searches = [i for n, i in tus if n == 'WebSearch']
    fetches = [i for n, i in tus if n == 'WebFetch']
    seen = Counter(host(u) for u in links)
    cited_urls = list(dict.fromkeys(re.findall(r'https?://[^\s\)\]>"]+', result)))
    cited = list(dict.fromkeys(host(u) for u in cited_urls))
    qlangs = [script_of(s.get('query', '')) for s in searches]
    return dict(input_tokens=inp, output_tokens=out, helper_model_input_tokens=helper,
                searches=len(searches), page_opens=len(fetches),
                search_queries=[s.get('query', '') for s in searches],
                query_lang_local=sum(1 for q in qlangs if q == lang), query_lang_en=sum(1 for q in qlangs if q == 'en'),
                domains_seen_top=[d for d, _ in seen.most_common(8)], domains_seen_count=len(seen),
                links_seen=len(set(links)), links_seen_local=sum(1 for u in set(links) if is_local(u, lang)),
                domains_cited=cited, cited_urls=cited_urls,
                cited_local=sum(1 for u in cited_urls if is_local(u, lang)),
                answer_lang=text_lang(result),
                answer_mentions_20=bool(re.search(r'(\$\s?20|20\s?(달러|ドル|dólares|USD|доларів|дол))', result)),
                answer=result)

if __name__ == '__main__':
    print(json.dumps({k: v for k, v in parse(sys.argv[1], sys.argv[2]).items() if k != 'answer'}, ensure_ascii=False, indent=1))


def parse_codex(path, lang):
    inp = out = cached = 0; items = []; msgs = []; seen = []
    for l in open(path, encoding='utf-8', errors='replace'):
        try: j = json.loads(l)
        except Exception: continue
        if j.get('type') == 'turn.completed':
            u = j.get('usage', {}); inp += u.get('input_tokens', 0); out += u.get('output_tokens', 0); cached += u.get('cached_input_tokens', 0)
        elif j.get('type') == 'item.completed':
            it = j.get('item', {})
            if it.get('type') == 'web_search': items.append(it); seen += [r.get('domain', '') for r in it.get('results') or [] if isinstance(r, dict)]
            elif it.get('type') == 'agent_message': msgs.append(it.get('text', ''))
    result = msgs[-1] if msgs else ''
    searches = [it for it in items if (it.get('action') or {}).get('type') == 'search']
    queries = [q for it in searches for q in ((it.get('action') or {}).get('queries') or [it.get('query', '')])]
    qlangs = [script_of(q) for q in queries]
    cited_urls = list(dict.fromkeys(u.rstrip('.,;') for u in re.findall(r'https?://[^\s\)\]>"]+', result)))
    seen_h = Counter(h[4:] if h.startswith('www.') else h for h in seen if h)
    return dict(input_tokens=inp, output_tokens=out, cached_input_tokens=cached, searches=len(searches), search_queries=queries,
                query_count=len(queries), query_lang_local=sum(1 for q in qlangs if q == lang), query_lang_en=sum(1 for q in qlangs if q == 'en'),
                page_opens=len(items) - len(searches), domains_seen_top=[d for d, _ in seen_h.most_common(8)], domains_seen_count=len(seen_h),
                cited_urls=cited_urls, domains_cited=list(dict.fromkeys(host(u) for u in cited_urls)),
                answer_lang=text_lang(result),
                answer_mentions_20=bool(re.search(r'(\$\s?20|20\s?(달러|ドル|dólares|USD|доларів|дол))', result)), answer=result)
