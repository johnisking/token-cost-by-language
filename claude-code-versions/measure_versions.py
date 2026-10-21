"""Claude Code baseline tokens by version.
For each version: npm-install it into its own folder, then send the one-character prompt "a" with claude -p
(model claude-haiku-5-5, empty working folder, auto-update off) and record the input tokens of that request
(uncached + cache read + cache write) plus the tools list from the init message.
Config: a fresh config folder (_cfg) holding only a copy of the login file (no user settings, plugins or CLAUDE.md).
ARM=clean (default): MCP off (--strict-mcp-config with an empty config, ENABLE_CLAUDEAI_MCP_SERVERS=false), 3 runs.
ARM=connectors: the account's claude.ai connectors left on, 1 run.
Raw output per run goes to raw/<version>_<arm>_<rep>.txt; summary to results_<arm>.json (resumes).
usage: [set ARM=connectors] python measure_versions.py [versions...]   (no args = versions.txt)"""
import json, os, shutil, subprocess, sys, time
BASE = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(BASE, "_cfg"); WORK = os.path.join(BASE, "_work"); RAW = os.path.join(BASE, "raw")
for d in (CFG, WORK, RAW): os.makedirs(d, exist_ok=True)
src = os.path.join(os.path.expanduser("~"), ".claude", ".credentials.json")
if not os.path.exists(os.path.join(CFG, ".credentials.json")): shutil.copy(src, os.path.join(CFG, ".credentials.json"))
ARM = os.environ.get("ARM", "clean")
REPS = 3 if ARM == "clean" else 1
versions = sys.argv[1:] or [l.strip() for l in open(os.path.join(BASE, "versions.txt")) if l.strip()]
OUT = os.path.join(BASE, f"results_{ARM}.json")
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
ENV = dict(os.environ, DISABLE_AUTOUPDATER="1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1", CLAUDE_CONFIG_DIR=CFG, DISABLE_TELEMETRY="1")
if ARM == "clean": ENV["ENABLE_CLAUDEAI_MCP_SERVERS"] = "false"
MCP = os.path.join(BASE, "mcp_empty.json"); open(MCP, "w").write('{"mcpServers": {}}')
NPM = shutil.which("npm")

def install(v):
    d = os.path.join(BASE, v)
    exe = os.path.join(d, "node_modules", ".bin", "claude.cmd")
    if not os.path.exists(exe):
        p = subprocess.run([NPM, "install", f"@anthropic-ai/claude-code@{v}", "--prefix", d, "--no-audit", "--no-fund", "--loglevel=error"],
                           capture_output=True, text=True, env=ENV)
        if not os.path.exists(exe): return None, (p.stderr or p.stdout)[-400:]
    return exe, None

def parse(out):
    init, result = None, None
    for line in out.splitlines():
        try: j = json.loads(line)
        except Exception: continue
        for x in (j if isinstance(j, list) else [j]):
            if not isinstance(x, dict): continue
            if x.get("type") == "system" and init is None: init = x
            if x.get("type") == "result": result = x
    return init, result

class _R:
    def __init__(self, out, err): self.stdout, self.stderr = out or "", err or ""

def runp(args, env, cwd):
    """Run with stdin closed; on timeout kill only this process tree (taskkill /T /PID)."""
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL,
                         text=True, encoding="utf-8", errors="replace", env=env, cwd=cwd)
    try:
        out, err = p.communicate(timeout=150)
    except subprocess.TimeoutExpired:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
        p.communicate()
        raise
    return _R(out, err)

def call(exe, fmt):
    args = [exe, "-p", "a", "--model", "claude-haiku-5-5", "--output-format", fmt] + (["--verbose"] if fmt == "stream-json" else [])
    if ARM == "clean":
        p = runp(args + ["--strict-mcp-config", "--mcp-config", MCP], ENV, WORK)
        if "unknown option" not in (p.stderr + p.stdout).lower(): return p, True
        return runp(args, ENV, WORK), False
    return runp(args, ENV, WORK), False

def run(exe, v, rep):
    t0 = time.time()
    p, strict = call(exe, "stream-json")
    open(os.path.join(RAW, f"{v}_{ARM}_{rep}.txt"), "w", encoding="utf-8").write(p.stdout + "\n--STDERR--\n" + p.stderr[-2000:])
    init, result = parse(p.stdout)
    if not result:
        p, strict = call(exe, "json")
        open(os.path.join(RAW, f"{v}_{ARM}_{rep}_json.txt"), "w", encoding="utf-8").write(p.stdout + "\n--STDERR--\n" + p.stderr[-2000:])
        _, result = parse(p.stdout)
    if not result: return {"error": (p.stderr or p.stdout)[-300:]}
    u = result.get("usage") or {}
    total = sum(u.get(k, 0) or 0 for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    return {"usage_total": total, "usage": u, "modelUsage": result.get("modelUsage"), "num_turns": result.get("num_turns"), "strict_mcp": strict,
            "cost": result.get("total_cost_usd", result.get("cost_usd")), "tools": (init or {}).get("tools"),
            "mcp": (init or {}).get("mcp_servers"), "init_model": (init or {}).get("model"), "secs": round(time.time() - t0, 1)}

for v in versions:
    if v in res and len([r for r in res[v].get("runs", []) if r.get("usage_total")]) >= REPS: continue
    exe, err = install(v)
    if not exe:
        res[v] = {"install_error": err}; print(v, "INSTALL FAIL", (err or "")[-150:], flush=True)
        json.dump(res, open(OUT, "w"), indent=1); continue
    runs = []
    for rep in range(REPS):
        try: r = run(exe, v, rep)
        except subprocess.TimeoutExpired: r = {"error": "timeout"}
        runs.append(r)
        print(ARM, v, rep, r.get("usage_total"), len(r.get("tools") or []), (r.get("error") or "")[:120].replace("\n", " "), flush=True)
        if r.get("error"): break
    res[v] = {"runs": runs}
    json.dump(res, open(OUT, "w"), indent=1)
print("saved", OUT)
