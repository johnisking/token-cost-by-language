"""Run on the PC with Claude Code: count input tokens for the 41 index prompts on one Claude model.
Usage: python lti_measure_claude.py claude-haiku-5-5   (try it on two prompts first; the tool set cancels out in the baseline)
Same method as dataset 2: claude -p with a fixed one-line system prompt and no MCP, input = uncached + cache read + cache write,
minus the same run with a one-character message. Writes res_<model>.json next to this script."""
import json, os, shutil, subprocess, sys
model = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
prompts = json.load(open(os.path.join(here, "lti_prompts.json"), encoding="utf-8"))
SYS = "Reply with OK."
MCP = os.path.join(here, "mcp_empty.json")
open(MCP, "w").write('{"mcpServers": {}}')
def run(text):
    p = subprocess.run([shutil.which("claude"), "-p", "--model", model, "--output-format", "json", "--system-prompt", SYS,
                        "--strict-mcp-config", "--mcp-config", MCP],
                       input=text, capture_output=True, text=True, encoding="utf-8",
                       env=dict(os.environ, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"), cwd=here)
    j = json.loads(p.stdout)
    total = 0
    for m, u in j.get("modelUsage", {}).items():
        if model in m:
            total += u.get("inputTokens", 0) + u.get("cacheReadInputTokens", 0) + u.get("cacheCreationInputTokens", 0)
    return total
out = {"_base": {"total": run("a"), "model": [model]}}
for code, text in prompts.items():
    out[code] = {"total": run(text), "model": [model]}
    print(code, out[code]["total"] - out["_base"]["total"], flush=True)
json.dump(out, open(os.path.join(here, f"res_{model}.json"), "w", encoding="utf-8"), indent=1)
print("saved", f"res_{model}.json")
