"""Build combined.json for the Claude Code harness-features dataset from the raw stream-json logs.

Every condition gives Claude Code (Opus 5.5, effort medium) the same brick-breaker task, five runs each.
Plan mode is two calls in one session (plan, then "Go ahead and implement your plan." with -c); the
second call's totals are cumulative, so they are the totals for the whole task.
usage: python3 build_combined.py   (run check_works.py first for the browser check)
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CONDS = ["default", "safemode", "minimal", "subagent", "plan", "skill", "hook"]
LABEL = {
    "default": "Default Claude Code",
    "safemode": "--safe-mode (no personal plugins, skills, hooks or CLAUDE.md)",
    "minimal": "Minimal harness (one-line system prompt, Write and Read only)",
    "subagent": "Asked to delegate to a subagent",
    "plan": "Plan mode, then implement",
    "skill": "One project skill (html-canvas-games)",
    "hook": "PostToolUse hook that sends a check message back",
}


def read(path):
    res, tools, sub_tools = None, collections.Counter(), collections.Counter()
    for l in open(path, encoding="utf-8", errors="replace"):
        try:
            j = json.loads(l)
        except Exception:
            continue
        if j.get("type") == "assistant":
            for c in j["message"].get("content", []):
                if c.get("type") == "tool_use":
                    (sub_tools if j.get("parent_tool_use_id") else tools)[c["name"]] += 1
        if j.get("type") == "result":
            res = j
    return res, tools, sub_tools


def row(cond, run, works):
    d = os.path.join(HERE, "runs", f"{cond}_r{run}")
    logs = ["run.jsonl"] + (["run2.jsonl"] if cond == "plan" else [])
    tools, sub_tools, res = collections.Counter(), collections.Counter(), None
    for lg in logs:
        r, t, s = read(os.path.join(d, lg))
        tools += t; sub_tools += s; res = r
    mu = res["modelUsage"]
    html = os.path.join(d, "work", "index.html")
    w = works.get(f"runs/{cond}_r{run}/work/index.html", {})
    return dict(
        condition=cond, run=run,
        input_tokens=sum(v["inputTokens"] + v["cacheReadInputTokens"] + v["cacheCreationInputTokens"] for v in mu.values()),
        cache_read_tokens=sum(v["cacheReadInputTokens"] for v in mu.values()),
        output_tokens=sum(v["outputTokens"] for v in mu.values()),
        api_cost_usd=round(res["total_cost_usd"], 3),
        models={k: v["inputTokens"] + v["cacheReadInputTokens"] + v["cacheCreationInputTokens"] for k, v in mu.items()},
        seconds=int(open(os.path.join(d, "seconds.txt"), encoding="utf-8-sig").read().strip()),
        tool_calls=sum(tools.values()), subagent_tool_calls=sum(sub_tools.values()),
        tools=dict(tools), subagent_tools=dict(sub_tools),
        used_subagent=any(k in tools for k in ("Agent", "Task")),
        used_skill="Skill" in tools,
        file_chars=len(open(html, encoding="utf-8", errors="replace").read()) if os.path.exists(html) else 0,
        works=w.get("works"), page_errors=w.get("errors"),
    )


def main():
    wp = os.path.join(HERE, "works.json")
    works = json.load(open(wp)) if os.path.exists(wp) else {}
    rows = [row(c, r, works) for c in CONDS for r in range(1, 6)]
    out = dict(measured="2026-10-19", tool="Claude Code 2.1.295 (Opus 5.5), effort medium, claude -p --output-format stream-json, no MCP servers",
               prompt=open(os.path.join(HERE, "prompt.txt"), encoding="utf-8-sig").read().strip(),
               subagent_prompt=open(os.path.join(HERE, "prompt_sub.txt"), encoding="utf-8-sig").read().strip(),
               conditions=LABEL, rows=rows)
    json.dump(out, open(os.path.join(HERE, "combined.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(rows), "rows")


if __name__ == "__main__":
    main()
