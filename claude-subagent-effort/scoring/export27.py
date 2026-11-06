import json,os,re,csv,random,statistics as st,collections,sys
sys.path.insert(0,'/home/claude/ds27/scoring'); from score import score
Q={q['id']:q for q in json.load(open('questions.json'))}
R='runs1'; rows=[]; answers=[]
MID={'haiku':'claude-haiku-5-5','opus':'claude-opus-5-5'}; EFF={'C0':'','C1':'low','C2':'medium','C3':'high'}
def mask(s): return re.sub(r'(?i)CHOJAEHYUN','USER',s)
for n in sorted(os.listdir(R)):
    qid,m,c,rep=n.split('_'); p=f'{R}/{n}/run.jsonl'
    ev=[];agents=0;subm=collections.Counter();outtok=0
    for l in open(p,encoding='utf-8',errors='replace'):
        try:o=json.loads(l)
        except:continue
        if o.get('type')=='result': ev.append(o)
        if o.get('type')=='assistant':
            if o.get('parent_tool_use_id'): subm[o['message'].get('model')]+=1
            else:
                for x in o['message'].get('content',[]):
                    if x.get('type')=='tool_use' and x.get('name') in('Agent','Task'): agents+=1
    texts=[e.get('result') or '' for e in ev]; last=ev[-1]
    d=open(f'{R}/{n}/done.txt',encoding='utf-8',errors='replace').read()
    sec=int(re.search(r'seconds=(\d+)',d).group(1)); to='timeout=True' in d
    k=Q[qid]['key']
    rows.append(dict(run=n,model=MID[m],condition=c,subagent_effort=EFF[c],question=qid,repo=Q[qid]['repo'],commit=Q[qid]['commit'],rep=int(rep[1:]),
      key_items=len(k),recall=round(score('\n'.join(texts),k)[0],4),recall_last_result_only=round(score(texts[-1],k)[0],4),recall_first_result_only=round(score(texts[0],k)[0],4),
      result_events=len(ev),timed_out=to,subagent_calls=agents,subagent_models='|'.join(sorted(x for x in subm if x)),
      api_cost_usd=round(last.get('total_cost_usd') or 0,6),seconds=sec,turns=last.get('num_turns'),output_tokens=(last.get('usage') or {}).get('output_tokens')))
    answers.append(dict(run=n,result_texts=[mask(t) for t in texts]))
os.makedirs('pub',exist_ok=True)
with open('pub/claude-subagent-effort.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
with open('pub/answers.jsonl','w') as f:
    for a in answers: f.write(json.dumps(a,ensure_ascii=False)+'\n')
# stats: per question mean, then mean; bootstrap over questions diff vs C0
def cellq(m,c,f):
    by=collections.defaultdict(list)
    for r in rows:
        if r['model']==MID[m] and r['condition']==c: by[r['question']].append(r[f])
    return {q:st.mean(v) for q,v in by.items()}
rnd=random.Random(27); summ={}
for m in ['haiku','opus']:
    base=cellq(m,'C0','recall'); bc=st.mean(r['api_cost_usd'] for r in rows if r['model']==MID[m] and r['condition']=='C0')
    for c in ['C0','C1','C2','C3']:
        cq=cellq(m,c,'recall'); qs=sorted(cq); diff=[cq[q]-base[q] for q in qs]
        bs=sorted(st.mean(rnd.choice(diff) for _ in qs) for _ in range(10000))
        xs=[r for r in rows if r['model']==MID[m] and r['condition']==c]
        cost=st.mean(r['api_cost_usd'] for r in xs)
        summ[f'{m}_{c}']=dict(recall_pct=round(100*st.mean(cq.values()),1),
            recall_last_only_pct=round(100*st.mean(cellq(m,c,'recall_last_result_only').values()),1),
            recall_first_only_pct=round(100*st.mean(cellq(m,c,'recall_first_result_only').values()),1),
            diff_vs_C0_pts=round(100*st.mean(diff),1),ci95_pts=[round(100*bs[249],1),round(100*bs[9749],1)],
            cost_usd=round(cost,4),cost_change_pct=round(100*(cost/bc-1)),median_seconds=st.median(r['seconds'] for r in xs),
            subagent_calls_mean=round(st.mean(r['subagent_calls'] for r in xs),2),timeouts=sum(r['timed_out'] for r in xs),
            multi_result_runs=sum(r['result_events']>1 for r in xs),runs=len(xs))
json.dump(dict(dataset='claude-subagent-effort',claude_code='2.1.318',runs=rows,summary=summ,
   questions=[{k:q[k] for k in ('id','repo','commit','scope','q')}|{'key_items':len(q['key'])} for q in Q.values()]),open('pub/claude-subagent-effort.json','w'),indent=1)
for k,v in summ.items(): print(k,v)
