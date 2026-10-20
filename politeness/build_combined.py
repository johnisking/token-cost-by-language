"""Build combined.json for the politeness-tax dataset from raw/res_<model>_r<n>.json and gpt_counts.json.
Claude input tokens = run input minus the run's one-character baseline. usage: python3 build_combined.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, "prompts.json"), encoding="utf-8"))
G = json.load(open(os.path.join(HERE, "gpt_counts.json")))
PRICE = {"claude-opus-5-5": (4, 20), "claude-haiku-5-5": (0.10, 0.50)}
rows = []
for model, rep in [("claude-opus-5-5", 1), ("claude-opus-5-5", 2), ("claude-haiku-5-5", 1)]:
    d = json.load(open(os.path.join(HERE, "raw", f"res_{model}_r{rep}.json"), encoding="utf-8"))
    b = d["_base"]["inp"]
    for L in ("ko", "ja", "en"):
        for q in range(10):
            for lv in range(4):
                x = d[f"{L}_{q}_{lv}"]
                pin = x["inp"] - b
                rows.append(dict(model=model, rep=rep, language=L, request=q + 1, level=lv, level_name=P["_levels"][L][lv],
                                 prompt=P[L][q][lv], prompt_tokens=pin, gpt_o200k_tokens=G[L][q][lv][0], gpt_cl100k_tokens=G[L][q][lv][1],
                                 output_tokens=x["out"], answer_chars=x["chars"],
                                 cost_usd=round((pin * PRICE[model][0] + x["out"] * PRICE[model][1]) / 1e6, 6), seconds=x["sec"]))
out = dict(measured="2026-10-20", levels=P["_levels"],
           tool="Claude Code 2.1.295, claude -p --system-prompt 'You are a helpful assistant.' --tools '' (plain chat, no tools), no MCP; GPT counts with js-tiktoken",
           cost_note="cost_usd = prompt tokens x input price + output tokens x output price at API list prices (Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 per million); the fixed system prompt is left out",
           rows=rows)
json.dump(out, open(os.path.join(HERE, "combined.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for model in PRICE:
    for L in ("ko", "ja", "en"):
        r = [x for x in rows if x["model"] == model and x["language"] == L]
        s = lambda lv, k: sum(x[k] for x in r if x["level"] == lv)
        print(model, L, "prompt", [s(l, "prompt_tokens") for l in range(4)], "out", [s(l, "output_tokens") for l in range(4)],
              "cost", [round(s(l, "cost_usd"), 4) for l in range(4)])
