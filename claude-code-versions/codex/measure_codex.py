"""Codex CLI baseline tokens by version (companion to Claude Code baseline tokens by version).
For each version: npm-install @openai/codex@<version> into its own folder, then run
  codex exec --json --skip-git-repo-check -s read-only -m <MODEL> -c model_reasoning_effort="low" "a"
in an empty folder with a fresh CODEX_HOME that holds only a copy of auth.json (no config, plugins, AGENTS.md or MCP).
Record the input tokens of the turn (input_tokens already includes cached input) and the raw log.
3 runs per version. Resumes. Usage: python measure_codex.py [versions...]  (default: versions.txt)"""
import json, os, re, shutil, subprocess, sys, time
BASE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.join(BASE, "_home"); WORK = os.path.join(BASE, "_work"); RAW = os.path.join(BASE, "raw")
for d in (HOME, WORK, RAW): os.makedirs(d, exist_ok=True)
shutil.copy(os.path.join(os.path.expanduser("~"), ".codex", "auth.json"), os.path.join(HOME, "auth.json"))
MODEL = os.environ.get("MODEL", "gpt-6-luna")
if MODEL == "default": MODEL = ""
REPS = int(os.environ.get("REPS", "3"))
versions = sys.argv[1:] or [l.strip() for l in open(os.path.join(BASE, "versions.txt")) if l.strip()]
OUT = os.path.join(BASE, "results.json")
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
ENV = dict(os.environ, CODEX_HOME=HOME, NO_COLOR="1")
NPM = shutil.which("npm")

def install(v):
    d = os.path.join(BASE, "v", v)
    exe = os.path.join(d, "node_modules", ".bin", "codex.cmd")
    if not os.path.exists(exe):
        p = subprocess.run([NPM, "install", f"@openai/codex@{v}", "--prefix", d, "--no-audit", "--no-fund", "--loglevel=error"],
                           capture_output=True, text=True, env=ENV)
        if not os.path.exists(exe): return None, (p.stderr or p.stdout)[-400:]
    return exe, None

def parse(out):
    """Return (input_tokens, cached, output, model) from the last usage report in the log; handles old and new log formats."""
    inp = cached = outp = None; model = None
    for line in out.splitlines():
        try: j = json.loads(line)
        except Exception: continue
        u = None
        if isinstance(j, dict):
            if j.get("type") == "turn.completed": u = j.get("usage")
            msg = j.get("msg") if isinstance(j.get("msg"), dict) else None
            if msg and msg.get("type") == "token_count":
                u = msg.get("info", {}).get("total_token_usage") if isinstance(msg.get("info"), dict) else msg
            if j.get("model") and not model: model = j.get("model")
            if msg and msg.get("model") and not model: model = msg.get("model")
        if u and u.get("input_tokens") is not None:
            inp, cached, outp = u.get("input_tokens"), u.get("cached_input_tokens"), u.get("output_tokens")
    return inp, cached, outp, model

def fresh_home():
    shutil.rmtree(HOME, ignore_errors=True); os.makedirs(HOME, exist_ok=True)
    shutil.copy(os.path.join(os.path.expanduser("~"), ".codex", "auth.json"), os.path.join(HOME, "auth.json"))

def run(exe, v, rep):
    fresh_home()
    t0 = time.time()
    args = [exe, "exec", "--json", "--skip-git-repo-check", "-s", "read-only"] + (["-m", MODEL] if MODEL else []) + ["-c", 'model_reasoning_effort="low"', "a"]
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV, cwd=WORK, stdin=subprocess.DEVNULL, timeout=240)
    log = p.stdout + "\n--STDERR--\n" + p.stderr[-3000:]
    open(os.path.join(RAW, f"{v}_{rep}.txt"), "w", encoding="utf-8").write(log)
    if "--json" in p.stderr and ("unexpected argument" in p.stderr or "unrecognized" in p.stderr):
        return {"error": "no --json in this version"}
    inp, cached, outp, model = parse(p.stdout)
    if inp is None: return {"error": (p.stderr or p.stdout)[-300:]}
    return {"input_tokens": inp, "cached": cached, "output": outp, "secs": round(time.time() - t0, 1)}

for v in versions:
    if v in res and len([r for r in res[v].get("runs", []) if r.get("input_tokens")]) >= REPS: continue
    exe, err = install(v)
    if not exe:
        res[v] = {"install_error": err}; print(v, "INSTALL FAIL", (err or "")[-150:].replace("\n", " "), flush=True)
        json.dump(res, open(OUT, "w"), indent=1); continue
    runs = []
    for rep in range(REPS):
        try: r = run(exe, v, rep)
        except subprocess.TimeoutExpired: r = {"error": "timeout"}
        runs.append(r)
        print(v, rep, r.get("input_tokens"), r.get("cached"), (r.get("error") or "")[:150].replace("\n", " "), flush=True)
        if r.get("error"): break
    res[v] = {"runs": runs}
    json.dump(res, open(OUT, "w"), indent=1)
print("DONE", flush=True)


