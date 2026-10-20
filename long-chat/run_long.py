"""Long conversation cost: 30 requests on one game.
Variants: claude_one (one session), claude_compact (one session, /compact after request 15),
claude_fresh (new session for every request), codex_one, codex_fresh.
Usage: python run_long.py claude_one 1"""
import json, os, shutil, subprocess, sys, time
variant, rep = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
reqs = [l.strip() for l in open(os.path.join(here, "requests.txt"), encoding="utf-8") if l.strip()]
MCP = os.path.join(os.path.dirname(here), "empty_mcp.json")
CLAUDE = shutil.which("claude")
CODEX = os.path.join(os.path.expanduser("~"), ".codex", "plugins", ".plugin-appserver", "codex.exe")
d = os.path.join(here, "runs", f"{variant}_r{rep}"); work = os.path.join(d, "work"); os.makedirs(work, exist_ok=True)
FRESH_PREFIX = "The game is in index.html in the current folder. "
def ids(out, key):
    v = None
    for line in open(out, encoding="utf-8"):
        try:
            v = json.loads(line).get(key) or v
        except Exception:
            pass
    return v
def claude(text, out, resume):
    args = [CLAUDE, "-p", "--effort", "medium", "--output-format", "stream-json", "--verbose", "--mcp-config", MCP,
            "--strict-mcp-config", "--permission-mode", "acceptEdits"] + (["--resume", resume] if resume else [])
    with open(out, "w", encoding="utf-8") as f:
        subprocess.run(args, input=text, stdout=f, stderr=subprocess.STDOUT, text=True, encoding="utf-8", cwd=work)
    return ids(out, "session_id")
def codex(text, out, resume):
    a = [CODEX, "exec"] + (["resume", resume] if resume else []) + ["--json", "--skip-git-repo-check", "-c", 'model_reasoning_effort="medium"']
    a += ["-c", 'sandbox_mode="workspace-write"'] if resume else ["-s", "workspace-write"]
    with open(out, "w", encoding="utf-8") as f:
        subprocess.run(a + [text], stdin=subprocess.DEVNULL, stdout=f, stderr=subprocess.STDOUT, text=True, encoding="utf-8", cwd=work)
    return ids(out, "thread_id")
fn = claude if variant.startswith("claude") else codex
sid = None
state = os.path.join(d, "state.json")
if os.path.exists(state):
    sid = json.load(open(state))["sid"]
for i, r in enumerate(reqs, 1):
    out = os.path.join(d, f"turn{i:02d}.jsonl")
    if os.path.exists(out) and '"type":"result"' in open(out, encoding="utf-8").read() or (os.path.exists(out) and fn is codex and os.path.getsize(out) > 0):
        continue
    fresh = variant.endswith("fresh")
    text = (FRESH_PREFIX + r) if (fresh and i > 1) else r
    t0 = time.time()
    s = fn(text, out, None if (fresh or i == 1) else sid)
    if not fresh and i == 1:
        sid = s
    json.dump(dict(sid=sid), open(state, "w"))
    open(os.path.join(d, f"turn{i:02d}.sec"), "w").write(str(round(time.time() - t0)))
    print(variant, i, round(time.time() - t0), flush=True)
    if variant == "claude_compact" and i == 15:
        claude("/compact", os.path.join(d, "compact.jsonl"), sid)
        print("compacted", flush=True)
print("ALL DONE")
