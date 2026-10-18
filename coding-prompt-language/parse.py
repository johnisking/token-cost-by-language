import json, os, re, sys
def claude(p):
    for l in open(p, encoding='utf-8', errors='replace'):
        try: j = json.loads(l)
        except Exception: continue
        if 'modelUsage' in j:
            mu = j['modelUsage']
            return dict(input_tokens=sum(v.get('inputTokens', 0) + v.get('cacheReadInputTokens', 0) + v.get('cacheCreationInputTokens', 0) for v in mu.values()),
                        cached_input_tokens=sum(v.get('cacheReadInputTokens', 0) for v in mu.values()),
                        output_tokens=sum(v.get('outputTokens', 0) for v in mu.values()), api_cost_usd=round(j.get('total_cost_usd'), 2), reply=j.get('result', ''))
def codex(p):
    inp = cached = out = 0; msg = ''
    for l in open(p, encoding='utf-8', errors='replace'):
        try: j = json.loads(l)
        except Exception: continue
        if j.get('type') == 'turn.completed':
            u = j['usage']; inp += u['input_tokens']; cached += u['cached_input_tokens']; out += u['output_tokens']
        if j.get('type') == 'item.completed' and j['item'].get('type') == 'agent_message': msg = j['item']['text']
    return dict(input_tokens=inp, cached_input_tokens=cached, output_tokens=out, api_cost_usd=None, reply=msg)
def ui_lang(html):
    s = re.sub(r'<script[^>]*src=[^>]*>', '', html)
    n = dict(ko=len(re.findall(r'[가-힣]', s)), ja=len(re.findall(r'[぀-ヿ]', s)), uk=len(re.findall(r'[Ѐ-ӿ]', s)))
    b = max(n, key=n.get)
    if n[b] >= 10: return b
    es = len(re.findall(r'\b(Puntos|Vidas|Nivel|Puntuación|Pulsa|Haz clic|Fin del juego|¡)', s, re.I))
    return 'es' if es >= 2 else 'en'
