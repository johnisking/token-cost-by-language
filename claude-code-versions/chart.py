import json, datetime as dt, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, matplotlib.dates as md
D = json.load(open('blog_data/ccversions/combined.json'))
C = [r for r in D['rows'] if r['arm'] == 'clean']; K = {r['version']: r for r in D['rows'] if r['arm'] == 'connectors'}
BG='#0f0f12'; FG='#e4e4e7'; MU='#a1a1aa'; GR='#27272a'; V='#a78bfa'; P='#f472b6'
plt.rcParams.update({'font.family':'DejaVu Sans','text.color':FG,'axes.labelcolor':MU,'xtick.color':MU,'ytick.color':MU})
fig,(a1,a2)=plt.subplots(1,2,figsize=(12,6.2),facecolor=BG,gridspec_kw={'width_ratios':[1.7,1]})
for a in (a1,a2):
    a.set_facecolor(BG); [s.set_visible(False) for s in a.spines.values()]; a.grid(axis='y',color=GR,lw=0.8); a.set_axisbelow(True)
d=[dt.date.fromisoformat(r['released']) for r in C]; y=[r['first_request_input_tokens'] for r in C]
a1.plot(d,y,color=V,lw=2.2,marker='o',ms=4)
lab={'1.0.60','2.1.0','2.1.150','2.1.290','2.1.306'}
for r,x,yy in zip(C,d,y):
    if r['version'] in lab: a1.annotate(f"{r['version']}\n{yy:,}",(x,yy),textcoords='offset points',xytext=(0,10),ha='center',fontsize=9,color=FG)
a1.set_ylim(0,42000); a1.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v,_: f'{int(v/1000)}k'))
a1.xaxis.set_major_formatter(md.DateFormatter('%b %Y')); a1.set_ylabel('input tokens of the first request (prompt: "a")')
a1.set_title('Claude Code baseline by version (MCP off)',color=FG,fontsize=12,loc='left')
vs=[v for v in ['2.1.80','2.1.85','2.1.100','2.1.131','2.1.150','2.1.306'] if v in K]
vals=[K[v]['first_request_input_tokens'] for v in vs]
cols=[P if x>100000 else V for x in vals]
a2.bar(range(len(vs)),vals,color=cols)
for i,x in enumerate(vals): a2.text(i,x+6000,f"{x/1000:.0f}k",ha='center',color=FG,fontsize=10)
a2.set_xticks(range(len(vs))); a2.set_xticklabels(vs,fontsize=9,color=FG); a2.set_ylim(0,440000)
a2.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v,_: f'{int(v/1000)}k'))
a2.set_title('Same, with 13 claude.ai apps connected',color=FG,fontsize=12,loc='left')
fig.text(0.02,0.95,'What Claude Code sends before you type anything',fontsize=18,fontweight='bold',color=FG)
fig.text(0.02,0.905,'Input tokens of the first request for the prompt "a" · Claude Haiku 5.5 · 3 runs per version, identical each time',fontsize=11,color=MU)
fig.text(0.02,0.02,'2026-10-21 · tokensave.app/data/claude-code-baseline-tokens-by-version · CC BY 4.0',fontsize=10,color=MU)
plt.subplots_adjust(top=0.80,bottom=0.12,left=0.07,right=0.98,wspace=0.18)
fig.savefig('src/static/claude-code-baseline-tokens-chart.png',dpi=100,facecolor=BG)
