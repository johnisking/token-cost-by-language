"""Build combined.json for the long-conversation dataset.
Raw: runs/<variant>_r<n>/turnNN.jsonl (claude -p stream-json). For one-session variants each --resume result reports
session totals, so per-request numbers are differences from the previous request (and from the /compact call).
usage: python3 build_combined.py <raw_dir>"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw")
VARIANTS = ["claude_one", "claude_compact", "claude_fresh"]


def result(path):
    r, steps = None, 0
    for l in open(path, encoding="utf-8", errors="replace"):
        try:
            j = json.loads(l)
        except Exception:
            continue
        if j.get("type") == "result":
            r = j
    return r


def tot(r):
    u = r["modelUsage"]
    s = lambda k: sum(v.get(k, 0) for v in u.values())
    return dict(cost=r["total_cost_usd"], inp=s("inputTokens"), cw=s("cacheCreationInputTokens"), cr=s("cacheReadInputTokens"), out=s("outputTokens"))


def main():
    reqs = [l.strip() for l in open(os.path.join(RAW, "requests.txt"), encoding="utf-8-sig") if l.strip()]
    rows, compacts = [], []
    for v in VARIANTS:
        for rep in (1, 2):
            d = os.path.join(RAW, "runs", f"{v}_r{rep}")
            if not os.path.isdir(d):
                continue
            prev = dict(cost=0, inp=0, cw=0, cr=0, out=0)
            prev_steps = 0
            for i in range(1, 31):
                r = result(os.path.join(d, f"turn{i:02d}.jsonl"))
                t = tot(r)
                steps = r.get("num_turns") or 0
                if v == "claude_compact" and i == 16:
                    c = result(os.path.join(d, "compact.jsonl")); ct = tot(c)
                    compacts.append(dict(variant=v, rep=rep, after_request=15, cost_usd=round(ct["cost"] - prev["cost"], 4),
                                         input_tokens=ct["inp"] + ct["cw"] + ct["cr"] - prev["inp"] - prev["cw"] - prev["cr"], output_tokens=ct["out"] - prev["out"]))
                    prev = ct
                one = v != "claude_fresh"
                delta = {k: t[k] - prev[k] for k in t} if one else t
                rows.append(dict(variant=v, rep=rep, request=i, text=reqs[i - 1],
                                 input_tokens=delta["inp"] + delta["cw"] + delta["cr"], cache_write_tokens=delta["cw"], cache_read_tokens=delta["cr"],
                                 uncached_input_tokens=delta["inp"], output_tokens=delta["out"], cost_usd=round(delta["cost"], 4),
                                 model_calls=steps, seconds=int(open(os.path.join(d, f"turn{i:02d}.sec")).read().strip())))
                if one:
                    prev = t
    out = dict(measured="2026-10-20", tool="Claude Code 2.1.295 (Opus 5.5), claude -p --effort medium --permission-mode acceptEdits, no MCP servers, stream-json",
               fresh_prefix="The game is in index.html in the current folder. ", requests=reqs, rows=rows, compactions=compacts)
    json.dump(out, open(os.path.join(HERE, "combined.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for v in VARIANTS:
        for rep in (1, 2):
            x = [r for r in rows if r["variant"] == v and r["rep"] == rep]
            if x:
                print(v, rep, round(sum(r["cost_usd"] for r in x) + sum(c["cost_usd"] for c in compacts if c["variant"] == v and c["rep"] == rep), 2),
                      "req2-5", round(sum(r["cost_usd"] for r in x[1:5]) / 4, 3), "req26-30", round(sum(r["cost_usd"] for r in x[25:30]) / 5, 3))
    print(compacts)


if __name__ == "__main__":
    main()
