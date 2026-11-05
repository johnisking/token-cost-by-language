"""ds27 scoring. recall = matched key items / key items, per run.
An item matches when (1) the item's file basename appears anywhere in the final answer, and
(2) one name in its accept list matches on a single line of the answer.
A name 'A.b' (owner A, member b) matches a line that contains 'A.b', or contains A and b as whole words.
A plain name matches as a whole word. Matching is case-sensitive."""
import json, re, sys
def wb(tok, line):
    return re.search(r'(?<![\w$])' + re.escape(tok) + r'(?![\w$])', line) is not None
def name_hit(name, lines):
    if '.' in name:
        owner, mem = name.rsplit('.', 1)
        return any(name in l or (wb(owner, l) and wb(mem, l)) for l in lines)
    return any(wb(name, l) for l in lines)
def score(answer, key):
    lines = answer.splitlines()
    hit = [k for k in key if k['file'].rsplit('/', 1)[-1] in answer and any(name_hit(a, lines) for a in k['accept'])]
    return len(hit) / len(key), hit
def final_text(jsonl_path):
    res = None
    for row in open(jsonl_path, encoding='utf-8', errors='replace'):
        try: o = json.loads(row)
        except Exception: continue
        if o.get('type') == 'result': res = o
    return (res or {}).get('result', '') or '', res
if __name__ == '__main__':
    qs = {q['id']: q for q in json.load(open(sys.argv[1]))}
    txt, _ = final_text(sys.argv[3])
    r, hit = score(txt, qs[sys.argv[2]]['key'])
    print(round(r, 3), len(hit), len(qs[sys.argv[2]]['key']))
