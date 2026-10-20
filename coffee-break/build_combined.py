"""Build combined.json for the coffee-break dataset: build a game (turn 1), wait W minutes, ask for a small change in the same
Claude Code session (turn 2, --resume). Raw: runs/claude_wWW_rN/{turn1,turn2}.jsonl + meta.json. usage: python3 build_combined.py <raw_dir>"""
import json, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw")


def parse(f):
    calls, seen, res = [], set(), None
    for l in open(f, encoding="utf-8", errors="replace"):
        try:
            j = json.loads(l)
        except Exception:
            continue
        if j.get("type") == "assistant":
            m = j["message"]
            if m["id"] in seen:
                continue
            seen.add(m["id"]); u = m["usage"]; cc = u.get("cache_creation") or {}
            calls.append(dict(cache_read=u.get("cache_read_input_tokens", 0), cache_write=u.get("cache_creation_input_tokens", 0),
                              cache_write_1h=cc.get("ephemeral_1h_input_tokens", 0), cache_write_5m=cc.get("ephemeral_5m_input_tokens", 0),
                              uncached=u.get("input_tokens", 0), output=u.get("output_tokens", 0)))
        if j.get("type") == "result":
            res = j
    return calls, res


rows = []
for d in sorted(glob.glob(os.path.join(RAW, "runs", "claude_w*_r*"))):
    if not os.path.exists(os.path.join(d, "turn2.jsonl")):
        continue
    meta = json.load(open(os.path.join(d, "meta.json")))
    c1, r1 = parse(os.path.join(d, "turn1.jsonl")); c2, r2 = parse(os.path.join(d, "turn2.jsonl"))
    rep = int(d.rsplit("_r", 1)[1])
    f = c2[0]
    rows.append(dict(wait_min=meta["wait_min"], rep=rep, actual_gap_s=meta["actual_gap_s"],
                     turn1_cost_usd=round(r1["total_cost_usd"], 4), turn2_cost_usd=round(r2["total_cost_usd"] - r1["total_cost_usd"], 4),
                     turn2_first_call_cache_read=f["cache_read"], turn2_first_call_cache_write=f["cache_write"],
                     turn2_first_call_cache_write_1h=f["cache_write_1h"], turn2_first_call_cache_write_5m=f["cache_write_5m"],
                     turn2_cache_write_total=sum(c["cache_write"] for c in c2), turn2_cache_read_total=sum(c["cache_read"] for c in c2),
                     turn2_model_calls=len(c2), cache_hit=f["cache_write"] < 5000))
rows.sort(key=lambda r: (r["rep"], r["wait_min"]))
out = dict(measured="2026-10-20", tool="Claude Code 2.1.295 (Opus 5.5), claude -p --effort medium --permission-mode acceptEdits, turn 2 with --resume; no MCP servers",
           turn1_prompt="Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish.",
           turn2_prompt="Make the ball red and slightly faster. Edit index.html and finish.", rows=rows)
json.dump(out, open(os.path.join(HERE, "combined.json"), "w", encoding="utf-8"), indent=1)
for r in rows:
    print(r["rep"], r["wait_min"], r["turn2_cost_usd"], r["turn2_first_call_cache_read"], r["turn2_first_call_cache_write"], r["cache_hit"])
