import json,os,re,collections,statistics as st,sys
sys.path.insert(0,'/home/claude/ds27/scoring'); from score import score
Q={q['id']:q for q in json.load(open('/home/claude/ds27/questions.json'))}
rows=[]
for n in sorted(os.listdir('runs')):
    p=f'runs/{n}/run.jsonl'; t=open(p,errors='replace').read()
    ev=[];sub=collections.Counter();main=collections.Counter();bg=None
    for l in t.splitlines():
        try:o=json.loads(l)
        except:continue
        if o.get('type')=='result': ev.append(o)
        if o.get('type')=='assistant':
            (sub if o.get('parent_tool_use_id') else main)[o['message'].get('model')]+=1
    parts=n.split('_'); part=parts[0]
    last=ev[-1] if ev else {}
    fail=('hit your' in t) or ('Failed to authenticate' in t)
    qid=parts[2] if part=='A' else parts[2]
    rec=score('\n'.join(e.get('result') or '' for e in ev),Q[qid]['key'])[0] if ev else 0
    mu={k:round(v.get('costUSD',0),4) for k,v in (last.get('modelUsage') or {}).items()}
    ss=last.get('subagent_stats') or {}
    d=open(f'runs/{n}/done.txt',errors='replace').read()
    rows.append(dict(name=n,part=part,ver=parts[1] if part=='A' else '2.1.318',cond=parts[1] if part=='B' else '',qid=qid,fail=fail,
      sub=dict(sub),main=dict(main),results=len(ev),cost=last.get('total_cost_usd'),mu=mu,bg=ss.get('started_in_background'),spawned=ss.get('spawned'),
      recall=rec,sec=int(re.search(r'seconds=(\d+)',d).group(1)),timeout='timeout=True' in d))
json.dump(rows,open('rows.json','w'))
def vkey(v): return tuple(int(x) for x in v.split('.'))
print('PART A')
for v in sorted({r['ver'] for r in rows if r['part']=='A'},key=vkey):
    xs=[r for r in rows if r['part']=='A' and r['ver']==v]
    subs=collections.Counter(m for r in xs for m in r['sub'])
    print(v,'n',len(xs),'fail',sum(r['fail'] for r in xs),'sub',dict(subs),'results',[r['results'] for r in xs],'bg',[r['bg'] for r in xs],'cost %.3f'%st.mean(r['cost'] or 0 for r in xs),'recall %.2f'%st.mean(r['recall'] for r in xs))
print('PART B')
for c in ['inherit','haiku']:
    xs=[r for r in rows if r['part']=='B' and r['cond']==c and not r['fail']]
    subs=collections.Counter(m for r in xs for m in r['sub'])
    print(c,'ok',len(xs),'sub',dict(subs),'cost %.3f'%st.mean(r['cost'] for r in xs),'recall %.3f'%st.mean(r['recall'] for r in xs),'sec',st.median(r['sec'] for r in xs))
