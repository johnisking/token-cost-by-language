"""Claude Haiku 5.5 at every effort level on the same brick-breaker task as our Opus 5.5 effort dataset (2026-10-09).
Each run in its own empty folder: claude -p --model claude-haiku-5-5 --effort <level> --permission-mode acceptEdits, no MCP servers.
Saves the stream-json log per run and results.json (resumes). 3 runs per level, 3 at a time."""
import json, os, shutil, subprocess, time
from concurrent.futures import ThreadPoolExecutor
BASE = os.path.dirname(os.path.abspath(__file__))
CLAUDE = shutil.which("claude")
MCP = os.path.join(BASE, "mcp_empty.json"); open(MCP, "w").write('{"mcpServers": {}}')
PROMPT = ("Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. "
          "It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish.")
LEVELS = ["low", "medium", "high", "xhigh", "max"]
OUT = os.path.join(BASE, "results.json")
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
jobs = [(lv, r) for r in range(3) for lv in LEVELS if f"{lv}_{r}" not in res]

def run(job):
    lv, r = job
    d = os.path.join(BASE, "runs", f"{lv}_{r}"); os.makedirs(d, exist_ok=True)
    t0 = time.time()
    p = subprocess.Popen([CLAUDE, "-p", PROMPT, "--model", "claude-haiku-5-5", "--effort", lv, "--permission-mode", "acceptEdits",
                          "--output-format", "stream-json", "--verbose", "--strict-mcp-config", "--mcp-config", MCP],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, text=True, encoding="utf-8", errors="replace",
                         cwd=d, env=dict(os.environ, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"))
    try:
        out, err = p.communicate(timeout=3600)
    except subprocess.TimeoutExpired:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True); out, err = p.communicate()
    open(os.path.join(BASE, "runs", f"{lv}_{r}.log"), "w", encoding="utf-8").write(out + "\n--STDERR--\n" + err[-2000:])
    result = None
    for line in out.splitlines():
        try: j = json.loads(line)
        except Exception: continue
        if j.get("type") == "result": result = j
    html = os.path.join(d, "index.html")
    row = {"level": lv, "rep": r, "secs": round(time.time() - t0, 1), "file": os.path.exists(html),
           "code_lines": sum(1 for _ in open(html, encoding="utf-8", errors="replace")) if os.path.exists(html) else 0}
    if result:
        u = result.get("usage") or {}
        mu = result.get("modelUsage") or {}
        row.update(cost_usd=result.get("total_cost_usd"), num_turns=result.get("num_turns"), duration_ms=result.get("duration_ms"),
                   output_tokens=sum(v.get("outputTokens", 0) for v in mu.values()),
                   thinking_tokens=sum(v.get("thinkingTokens", 0) or 0 for v in mu.values()),
                   total_tokens=sum(v.get("inputTokens", 0) + v.get("outputTokens", 0) + v.get("cacheReadInputTokens", 0) + v.get("cacheCreationInputTokens", 0) for v in mu.values()),
                   model_usage=mu, is_error=result.get("is_error"))
    return f"{lv}_{r}", row

with ThreadPoolExecutor(3) as ex:
    for k, row in ex.map(run, jobs):
        res[k] = row
        json.dump(res, open(OUT, "w"), indent=1)
        print(k, row.get("cost_usd"), row.get("output_tokens"), row.get("secs"), row.get("code_lines"), flush=True)
print("saved", OUT)
