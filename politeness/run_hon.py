"""Politeness tax: send each prompt (3 languages x 10 requests x 4 politeness levels) to a model as a plain chat
(no tools, short neutral system prompt) and record input/output tokens. Usage: python run_hon.py claude-opus-5-5 1"""
import json, os, shutil, subprocess, sys, time, urllib.request
model, rep = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
pf = os.path.join(here, "prompts.json")
if not os.path.exists(pf):
    urllib.request.urlretrieve("https://raw.githubusercontent.com/johnisking/tokensave/data-new-measures/_source/blog_data/honorific/prompts.json", pf)
d = json.load(open(pf, encoding="utf-8"))
MCP = os.path.join(here, "mcp_empty.json"); open(MCP, "w").write('{"mcpServers": {}}')
CLAUDE = shutil.which("claude")
env = dict(os.environ, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1")
SYS = "You are a helpful assistant."
def run(text):
    t0 = time.time()
    p = subprocess.run([CLAUDE, "-p", "--model", model, "--output-format", "json", "--system-prompt", SYS, "--tools", "",
                        "--strict-mcp-config", "--mcp-config", MCP], input=text, capture_output=True, text=True,
                       encoding="utf-8", env=env, cwd=here)
    j = json.loads(p.stdout)
    u = j.get("modelUsage", {}).get(model, {})
    return dict(inp=u.get("inputTokens", 0) + u.get("cacheReadInputTokens", 0) + u.get("cacheCreationInputTokens", 0),
                out=u.get("outputTokens", 0), cost=u.get("costUSD"), sec=round(time.time() - t0, 1),
                chars=len(j.get("result") or ""), result=j.get("result"), turns=j.get("num_turns"))
outf = os.path.join(here, f"res_{model}_r{rep}.json")
res = json.load(open(outf, encoding="utf-8")) if os.path.exists(outf) else {}
if "_base" not in res:
    res["_base"] = run("a")
for L in ("ko", "ja", "en"):
    for qi, q in enumerate(d[L]):
        for lv, text in enumerate(q):
            k = f"{L}_{qi}_{lv}"
            if k in res:
                continue
            res[k] = run(text)
            json.dump(res, open(outf, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
            print(k, res[k]["inp"] - res["_base"]["inp"], res[k]["out"], flush=True)
print("ALL DONE")
