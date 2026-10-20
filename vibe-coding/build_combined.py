"""Build combined.json for the vibe-coding-by-model dataset from raw/runs/<task>_<model>_r<n>/run.jsonl and works.json.
usage: python3 build_combined.py <raw_dir>"""
import collections, json, os, statistics, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw")
TASKS = ["brick", "2048", "sudoku"]
MODELS = ["haiku-5-5", "sonnet-5-5", "opus-5-5"]


def read(path):
    res, tools = None, collections.Counter()
    for l in open(path, encoding="utf-8", errors="replace"):
        try:
            j = json.loads(l)
        except Exception:
            continue
        if j.get("type") == "assistant":
            for c in j["message"].get("content", []):
                if c.get("type") == "tool_use":
                    tools[c["name"]] += 1
        if j.get("type") == "result":
            res = j
    return res, tools


def main():
    works = json.load(open(os.path.join(RAW, "works.json")))
    rows = []
    for t in TASKS:
        for m in MODELS:
            for r in range(1, 6):
                run = f"{t}_{m}_r{r}"
                d = os.path.join(RAW, "runs", run)
                if not os.path.exists(os.path.join(d, "run.jsonl")):
                    continue
                res, tools = read(os.path.join(d, "run.jsonl"))
                if not res:
                    continue
                mu = res["modelUsage"]
                w = works.get(run, {})
                html = os.path.join(d, "work", "index.html")
                rows.append(dict(
                    task=t, model="claude-" + m, run=r,
                    input_tokens=sum(v["inputTokens"] + v["cacheReadInputTokens"] + v["cacheCreationInputTokens"] for v in mu.values()),
                    cache_read_tokens=sum(v["cacheReadInputTokens"] for v in mu.values()),
                    output_tokens=sum(v["outputTokens"] for v in mu.values()),
                    api_cost_usd=round(res["total_cost_usd"], 4),
                    models_used=sorted(mu),
                    seconds=int(open(os.path.join(d, "seconds.txt"), encoding="utf-8-sig").read().strip()),
                    turns=res.get("num_turns"), tool_calls=sum(tools.values()),
                    file_bytes=os.path.getsize(html) if os.path.exists(html) else 0,
                    works=w.get("works"), check_points=w.get("points"),
                    rule_moves_ok=w.get("rule_moves_ok"), rule_moves_bad=w.get("rule_moves_bad"),
                    puzzles_unique=w.get("puzzles_unique"), page_errors=w.get("errors")))
    summ = {}
    for t in TASKS:
        for m in MODELS:
            rs = [x for x in rows if x["task"] == t and x["model"] == "claude-" + m]
            if not rs:
                continue
            med = lambda k: statistics.median(x[k] for x in rs)
            summ[f"{t}/{m}"] = dict(n=len(rs), works=sum(bool(x["works"]) for x in rs), cost=round(med("api_cost_usd"), 4),
                                   seconds=med("seconds"), input=med("input_tokens"), output=med("output_tokens"))
    out = dict(measured="2026-10-20", tool="Claude Code 2.1.295, claude -p --effort medium --permission-mode acceptEdits, no MCP servers, stream-json",
               prompts={t: open(os.path.join(RAW, f"prompt_{t}.txt"), encoding="utf-8-sig").read().strip() for t in TASKS},
               rows=rows, summary=summ)
    json.dump(out, open(os.path.join(HERE, "combined.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for k, v in summ.items():
        print(k, v)


if __name__ == "__main__":
    main()
