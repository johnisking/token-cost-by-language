"""Independent check of pxpipe (text rendered as PNG) on Claude Code, run on the PC.
Arms per document: text (plain), px (pxpipe's own output: page images + its factsheet), img (page images only).
Tokens = input (uncached + cache read + cache write) of the call minus a question-only call for the same model/document.
Recall = exact match of each answer.  usage: python run_px.py claude-haiku-5-5 [reps]"""
import base64, json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
here = os.path.dirname(os.path.abspath(__file__))
CLAUDE = shutil.which("claude")
MCP = os.path.join(here, "mcp_empty.json"); open(MCP, "w").write('{"mcpServers": {}}')
model = sys.argv[1]; reps = int(sys.argv[2]) if len(sys.argv) > 2 else 2
prof = "dense" if "fable" in model else "spaced"
C = json.load(open(os.path.join(here, "corpus.json"), encoding="utf-8"))
P = json.load(open(os.path.join(here, "payloads.json"), encoding="utf-8"))
Q = json.load(open(os.path.join(here, "questions.json"), encoding="utf-8"))
OUT = os.path.join(here, f"res_px_{model}.jsonl")
done = set()
if os.path.exists(OUT):
    for l in open(OUT, encoding="utf-8"):
        j = json.loads(l); done.add((j["doc"], j["arm"], j["rep"]))
SYS = "Answer from the provided document only. Never guess: use null for anything you cannot read with certainty."

def question(doc):
    items = "\n".join(f"{i+1}. {it['q']}" for i, it in enumerate(Q[doc]))
    return ("Answer each item below from the document above. Reply with only a JSON object mapping the item number "
            "to the exact value as a string (or null if you cannot find or read it):\n" + items)

def content(doc, arm):
    q = {"type": "text", "text": question(doc)}
    if arm == "base": return [q]
    if arm == "text": return [{"type": "text", "text": C[doc]["text"]}, q]
    imgs = [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b}} for b in P[doc][prof]["images"]]
    if arm == "img": return imgs + [q]
    return imgs + [{"type": "text", "text": t} for t in P[doc][prof]["texts"]] + [q]

def call(doc, arm):
    msg = {"type": "user", "message": {"role": "user", "content": content(doc, arm)}}
    for attempt in range(3):
        t0 = time.time()
        p = subprocess.run([CLAUDE, "-p", "--model", model, "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
                            "--system-prompt", SYS, "--strict-mcp-config", "--mcp-config", MCP, "--tools", ""],
                           input=json.dumps(msg) + "\n", capture_output=True, text=True, encoding="utf-8",
                           env=dict(os.environ, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"), cwd=here)
        for line in p.stdout.splitlines():
            try: j = json.loads(line)
            except Exception: continue
            if j.get("type") == "result" and j.get("modelUsage"):
                u = [v for k, v in j["modelUsage"].items() if model in k]
                if not u: continue
                u = u[0]
                return {"answer": j.get("result"), "inputTotal": u["inputTokens"] + u["cacheReadInputTokens"] + u["cacheCreationInputTokens"],
                        "output": u["outputTokens"], "costUSD": u.get("costUSD"), "secs": round(time.time() - t0, 1), "is_error": j.get("is_error")}
        err = p.stderr[-300:]
    return {"answer": None, "error": err}

jobs = [(d, "base", 0) for d in C] + [(d, a, r) for r in range(reps) for d in C for a in ("text", "px", "img")]
jobs = [j for j in jobs if j not in done]
print(model, prof, len(jobs), "calls to run", flush=True)
def work(j):
    d, a, r = j
    return j, call(d, a)
with ThreadPoolExecutor(3) as ex:
    for (d, a, r), res in ex.map(work, jobs):
        with open(OUT, "a", encoding="utf-8") as f:
            f.write(json.dumps({"model": model, "doc": d, "arm": a, "rep": r, **res}, ensure_ascii=False) + "\n")
        print(d, a, r, res.get("inputTotal"), (res.get("answer") or "")[:60].replace("\n", " "), flush=True)
print("saved", OUT)
