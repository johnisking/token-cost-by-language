import json,os,re,csv,collections,statistics as st,sys,random
sys.path.insert(0,'/home/claude/ds27/scoring'); from score import score
Q={q['id']:q for q in json.load(open('/home/claude/ds27/questions.json'))}
SET={'none':'','inherit':'','haiku':'CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5','force':'CLAUDE_CODE_SUBAGENT_MODEL=haiku; CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1',
     'a':'CLAUDE_CODE_SUBAGENT_MODEL=haiku','b':'CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5; CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1','c':'CLAUDE_CODE_SUBAGENT_MODEL=haiku; CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1'}
def vkey(v): return tuple(int(x) for x in v.split('.'))
def one(path,part,ver,model,qid,rep,setting,name):
    ev=[];sub=collections.Counter();main=collections.Counter()
    for l in open(path+'/run.jsonl',errors='replace'):
        try:o=json.loads(l)
        except:continue
        if o.get('type')=='result': ev.append(o)
        if o.get('type')=='assistant':
            (sub if o.get('parent_tool_use_id') else main)[o['message'].get('model')]+=1
    last=ev[-1]; mu=last.get('modelUsage') or {}
    d=open(path+'/done.txt',errors='replace').read()
    texts=[e.get('result') or '' for e in ev]; ss=last.get('subagent_stats') or {}
    return dict(run=name,part=part,claude_code=ver,main_model=model,question=qid,rep=rep,setting=SET[setting],
      subagent_models='|'.join(sorted(m for m in sub if m)),subagent_messages=sum(sub.values()),
      haiku_cost_usd=round(sum(v.get('costUSD',0) for k,v in mu.items() if 'haiku' in k),6),
      main_model_cost_usd=round(sum(v.get('costUSD',0) for k,v in mu.items() if 'haiku' not in k),6),
      api_cost_usd=round(last.get('total_cost_usd') or 0,6),recall=round(score('\n'.join(texts),Q[qid]['key'])[0],4),
      recall_last_result_only=round(score(texts[-1],Q[qid]['key'])[0],4),result_events=len(ev),
      started_in_background=ss.get('started_in_background'),seconds=int(re.search(r'seconds=(\d+)',d).group(1)),timed_out='timeout=True' in d,turns=last.get('num_turns'))
rows=[]
for n in sorted(os.listdir('runs')):
    p=n.split('_')
    if p[0]=='A': rows.append(one(f'runs/{n}','A',p[1],'claude-opus-4-5',p[2],int(p[3][1:]),'none',n))
    elif p[0]=='B': rows.append(one(f'runs/{n}','B','2.1.318','claude-opus-5-5',p[2],int(p[3][1:]),p[1],n))
    elif p[0]=='D': rows.append(one(f'runs/{n}','D','2.1.318','claude-opus-5-5',p[2],int(p[3][1:]),'force',n))
for v in sorted(os.listdir('bisect'),key=vkey): rows.append(one(f'bisect/{v}','A-probe',v,'claude-opus-4-5','M1',1,'none',f'probe_{v}'))
for n in sorted(os.listdir('partC')): rows.append(one(f'partC/{n}','C','2.1.318','claude-opus-5-5','M1',int(n.split('_r')[1]),n[0],f'C_{n}'))
rows.sort(key=lambda r:(r['part'],vkey(r['claude_code']),r['setting'],r['question'],r['rep']))
os.makedirs('pub',exist_ok=True)
with open('pub/claude-subagent-model-by-version.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
# summaries
A=[r for r in rows if r['part'] in('A','A-probe')]
byv=collections.OrderedDict()
for v in sorted({r['claude_code'] for r in A},key=vkey):
    xs=[r for r in A if r['claude_code']==v]
    byv[v]=dict(runs=len(xs),explore_model='|'.join(sorted({m for r in xs for m in r['subagent_models'].split('|') if m})),cost_usd=round(st.mean(r['api_cost_usd'] for r in xs),4),recall_pct=round(100*st.mean(r['recall'] for r in xs),1))
full=[r for r in rows if r['part']=='A']
hz=[r for r in full if 'haiku' in r['subagent_models']]; oz=[r for r in full if 'opus' in r['subagent_models']]
def perq(part,setting):
    by=collections.defaultdict(list)
    for r in rows:
        if r['part']==part and r['setting']==SET[setting]: by[r['question']].append(r)
    return by
bi=perq('B','inherit'); bh=perq('B','haiku'); dd=perq('D','force')
def cell(by): xs=[r for v in by.values() for r in v]; return dict(runs=len(xs),recall_pct=round(100*st.mean(st.mean(r['recall'] for r in v) for v in by.values()),1),cost_usd=round(st.mean(r['api_cost_usd'] for r in xs),4),median_seconds=st.median(r['seconds'] for r in xs),explore_model='|'.join(sorted({r['subagent_models'] for r in xs})))
rnd=random.Random(28); qs=sorted(bi); diff=[st.mean(r['recall'] for r in dd[q])-st.mean(r['recall'] for r in bi[q]) for q in qs]
bs=sorted(st.mean(rnd.choice(diff) for _ in qs) for _ in range(10000))
S=dict(switch=dict(last_haiku='2.1.197',first_main_model='2.1.198'),by_version=byv,
  partA=dict(haiku_era=dict(runs=len(hz),cost_usd=round(st.mean(r['api_cost_usd'] for r in hz),4),recall_pct=round(100*st.mean(r['recall'] for r in hz),1)),
             main_model_era=dict(runs=len(oz),cost_usd=round(st.mean(r['api_cost_usd'] for r in oz),4),recall_pct=round(100*st.mean(r['recall'] for r in oz),1))),
  partB_inherit=cell(bi),partB_model_only=cell(bh),partD_force=cell(dd),
  partD_vs_inherit=dict(recall_diff_pts=round(100*st.mean(diff),1),ci95_pts=[round(100*bs[249],1),round(100*bs[9749],1)]))
S['partA']['cost_change_pct']=round(100*(S['partA']['main_model_era']['cost_usd']/S['partA']['haiku_era']['cost_usd']-1))
S['partD_vs_inherit']['cost_change_pct']=round(100*(S['partD_force']['cost_usd']/S['partB_inherit']['cost_usd']-1))
json.dump(dict(dataset='claude-subagent-model-by-version',summary=S,runs=rows),open('pub/claude-subagent-model-by-version.json','w'),indent=1)
print(json.dumps({k:v for k,v in S.items() if k!='by_version'},indent=1)); print(len(rows))
for v,x in byv.items(): print(v,x)
