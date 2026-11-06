import json,os,re,collections,statistics as st,sys
sys.path.insert(0,'/home/claude/ds27'); from ds27info import info
R='/home/claude/ds27/runs1'; rows=[]
for n in sorted(os.listdir(R)):
    p=f'{R}/{n}/run.jsonl'; txt=open(p,encoding='utf-8',errors='replace').read()
    qid,m,c,r=n.split('_'); d=open(f'{R}/{n}/done.txt',encoding='utf-8',errors='replace').read()
    sec=int(re.search(r'seconds=(\d+)',d).group(1)); to='timeout=True' in d
    lim='hit your 5-hour limit' in txt
    i=info(p,qid); i.update(name=n,qid=qid,model=m,cond=c,sec=sec,timeout=to,limit=lim); rows.append(i)
json.dump(rows,open('/home/claude/ds27/scores1.json','w'))
ok=[x for x in rows if not x['limit']]
print('total',len(rows),'limit',len(rows)-len(ok),'timeout',[x['name'] for x in ok if x['timeout']])
for m in ['haiku','opus']:
  print('==',m)
  for c in ['C0','C1','C2','C3']:
    xs=[x for x in ok if x['model']==m and x['cond']==c]
    byq=collections.defaultdict(list)
    for x in xs: byq[x['qid']].append(x['recall'])
    rq=st.mean(st.mean(v) for v in byq.values())
    cost=st.mean(x['cost'] or 0 for x in xs); sec=st.median(x['sec'] for x in xs)
    ag=st.mean(x['agents'] for x in xs); subm=collections.Counter(k for x in xs for k in x['sub'])
    print(c,'n',len(xs),'q',len(byq),'recall %.1f'%(100*rq),'cost %.3f'%cost,'sec',sec,'agents %.2f'%ag,dict(subm))
