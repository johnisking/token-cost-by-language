import json,sys,collections
sys.path.insert(0,'scoring'); from score import score, final_text
Q={q['id']:q for q in json.load(open('questions.json'))}
def info(path, qid):
    models=collections.Counter(); agents=0; sub_models=collections.Counter()
    for row in open(path,encoding='utf-8',errors='replace'):
        try:o=json.loads(row)
        except: continue
        if o.get('type')=='assistant':
            m=o['message'].get('model'); 
            (sub_models if o.get('parent_tool_use_id') else models)[m]+=1
            for c in o['message'].get('content',[]):
                if c.get('type')=='tool_use' and c.get('name') in('Agent','Task') and not o.get('parent_tool_use_id'): agents+=1
    txt,res=final_text(path)
    r,hit=score(txt,Q[qid]['key'])
    return dict(recall=round(r,3),cost=(res or {}).get('total_cost_usd'),turns=(res or {}).get('num_turns'),agents=agents,main=dict(models),sub=dict(sub_models),usage_models=list(((res or {}).get('modelUsage') or {}).keys()))
if __name__=='__main__':
    print(info(sys.argv[1],sys.argv[2]))
