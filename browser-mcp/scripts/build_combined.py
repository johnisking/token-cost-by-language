"""combined.json for the browser-MCP token dataset (dataset 20).
Runs: Claude Code 2.1.295, Opus 5.5, effort medium, one MCP server per run (Playwright MCP 0.0.83 or Chrome DevTools MCP 1.11.0, headless, isolated),
built-in file/web/shell tools disabled. 'base' = server as shipped, 'diet' = the same server behind tokensave-mcp-diet 0.1.0 (compact, outline fallback; built as snapshot-diet).
Run folders: baseline/<srv>_<task>_r<n> (base, task set A) and diet/<srv>_<mode>_<task>_r<n> (mode base|v2; v2 = tokensave-mcp-diet 0.1.0; 'diet' = earlier outline-only build, not used).
"""
import json, os, glob, re
HERE = os.path.dirname(os.path.abspath(__file__))
SECONDS = {  # wall-clock seconds printed by the run scripts on the PC
 "pw_todo_r1":29,"pw_todo_r2":43,"pw_wiki_r1":15,"pw_wiki_r2":33,"cdt_todo_r1":21,"cdt_todo_r2":26,"cdt_wiki_r1":16,"cdt_wiki_r2":15,
 "pw_hn_r1":15,"pw_hn_r2":16,"pw_hist_r1":18,"pw_hist_r2":21,"pw_probe_r1":15,"cdt_hn_r1":16,"cdt_hn_r2":28,"cdt_hist_r1":18,"cdt_hist_r2":14,"cdt_probe_r1":22,
 "pw_base_snapread_r1":17,"pw_base_hnsnap_r1":25,"cdt_base_snapread_r1":32,"cdt_base_hnsnap_r1":17,"pw_base_snapread_r2":15,"cdt_base_snapread_r2":30,"pw_base_hnsnap_r2":26,"cdt_base_hnsnap_r2":24,
 "pw_v2_probe_r1":19,"cdt_v2_probe_r1":16,"pw_v2_snapread_r1":22,"cdt_v2_snapread_r1":19,"pw_v2_hnsnap_r1":20,"cdt_v2_hnsnap_r1":17,"pw_v2_snapread_r2":20,"cdt_v2_snapread_r2":18,"pw_v2_hnsnap_r2":20,"cdt_v2_hnsnap_r2":15,"pw_base_hnsnap_r3":18,"pw_v2_hnsnap_r3":19,"cdt_base_hnsnap_r3":18,"cdt_v2_hnsnap_r3":22,"pw_base_snapread_r3":24,"pw_v2_snapread_r3":16,"cdt_base_snapread_r3":30,"cdt_v2_snapread_r3":20,"pw_base_hnsnap_r4":15,"pw_v2_hnsnap_r4":15,"cdt_base_hnsnap_r4":19,"cdt_v2_hnsnap_r4":16,"pw_base_snapread_r4":19,"pw_v2_snapread_r4":16,"cdt_base_snapread_r4":25,"cdt_v2_snapread_r4":17,"pw_base_hnsnap_r5":18,"pw_v2_hnsnap_r5":24,"cdt_base_hnsnap_r5":16,"cdt_v2_hnsnap_r5":17,"pw_base_snapread_r5":21,"pw_v2_snapread_r5":18,"cdt_base_snapread_r5":26,"cdt_v2_snapread_r5":31,"pw_base_probe_r2":19,"pw_v2_probe_r2":18,"cdt_base_probe_r2":18,"cdt_v2_probe_r2":20,"pw_base_probe_r3":15,"pw_v2_probe_r3":17,"cdt_base_probe_r3":19,"cdt_v2_probe_r3":15,"pw_v3_snapread_r1":40,"cdt_v3_snapread_r1":25,"pw_v3_hnsnap_r1":21,"cdt_v3_hnsnap_r1":22,"pw_v3_snapread_r2":24,"cdt_v3_snapread_r2":21,"pw_v3_hnsnap_r2":19,"cdt_v3_hnsnap_r2":19,"pw_v3_snapread_r3":23,"cdt_v3_snapread_r3":21,"pw_v3_hnsnap_r3":31,"cdt_v3_hnsnap_r3":25,"pw_v3_snapread_r4":19,"cdt_v3_snapread_r4":25,"pw_v3_hnsnap_r4":19,"cdt_v3_hnsnap_r4":21,"pw_v3_snapread_r5":26,"cdt_v3_snapread_r5":22,"pw_v3_hnsnap_r5":20,"cdt_v3_hnsnap_r5":21,"pw_v3_probe_r1":19,"cdt_v3_probe_r1":21,"pw_v3_probe_r2":26,"cdt_v3_probe_r2":24,"pw_v3_probe_r3":22,"cdt_v3_probe_r3":23}
TASK = {"todo":"TodoMVC: add 3 items, complete 1, report items left","wiki":"Wikipedia Python article: designer and first year (any method)",
        "hn":"Hacker News: top 5 titles and points (any method)","hist":"Wikipedia History of Python: 5 release dates (any method)",
        "probe":"Wikipedia Python article: one full snapshot, reply 'done'","snapread":"Wikipedia Python article: designer and first year from a snapshot, no JavaScript",
        "hnsnap":"Hacker News: top 5 titles and points from a snapshot, no JavaScript"}

def read(p):
    reqs, seen, tools, results, res = [], set(), [], {}, None
    for l in open(p, encoding="utf-8", errors="replace"):
        try: j = json.loads(l)
        except Exception: continue
        if j.get("type") == "assistant":
            m = j["message"]; u = m.get("usage", {})
            if m["id"] not in seen:
                seen.add(m["id"]); reqs.append(u.get("input_tokens",0)+u.get("cache_read_input_tokens",0)+u.get("cache_creation_input_tokens",0))
            for c in m.get("content", []):
                if c.get("type") == "tool_use": tools.append((c["id"], c["name"].split("__")[-1], len(reqs)))
        if j.get("type") == "user" and isinstance(j["message"].get("content"), list):
            for c in j["message"]["content"]:
                if c.get("type") == "tool_result":
                    cc = c["content"]; t = cc if isinstance(cc, str) else "".join(x.get("text", "") for x in cc)
                    img = isinstance(cc, list) and any(x.get("type") == "image" for x in cc)
                    results[c["tool_use_id"]] = (len(t), img, t)
        if j.get("type") == "result": res = j
    return reqs, tools, results, res

rows = []
for p in sorted(glob.glob(os.path.join(HERE, "baseline/*/run.jsonl")) + glob.glob(os.path.join(HERE, "diet/*/run.jsonl"))):
    name = p.split(os.sep)[-2]; parts = name.split("_")
    if len(parts) == 3: srv, task, run = parts; mode = "base"
    else: srv, mode, task, run = parts
    if mode == "diet": continue
    reqs, tools, results, res = read(p)
    mu = res["modelUsage"]
    snaps = []
    for tid, tn, idx in tools:
        if tn in ("browser_snapshot", "take_snapshot"):
            n, img, t = results.get(tid, (0, False, ""))
            blocked = "exceeds maximum allowed tokens" in t
            m = re.search(r"result \(([\d,]+) characters", t)
            raw = int(m.group(1).replace(",", "")) if m else None
            m2 = re.search(r"snapshot was ([\d,]+) characters|compacted from ([\d,]+)|very large \(([\d,]+) characters", t)
            if m2: raw = int((m2.group(1) or m2.group(2) or m2.group(3)).replace(",", ""))
            added = reqs[idx] - reqs[idx - 1] if idx < len(reqs) else None  # tokens added by the next request
            snaps.append(dict(result_chars=n, raw_snapshot_chars=raw, blocked_by_claude_code=blocked, tokens_added_next_request=added))
    rows.append(dict(server={"pw":"playwright-mcp 0.0.83","cdt":"chrome-devtools-mcp 1.11.0"}[srv], srv=srv, mode={"base":"as shipped","v2":"tokensave-mcp-diet 0.1.0","v3":"tokensave-mcp-diet 0.2.0"}[mode],
                     task=task, task_label=TASK[task], run=int(run[1:]),
                     input_tokens=sum(v["inputTokens"]+v["cacheReadInputTokens"]+v["cacheCreationInputTokens"] for v in mu.values()),
                     output_tokens=sum(v["outputTokens"] for v in mu.values()), api_cost_usd=round(res["total_cost_usd"], 4),
                     requests=len(reqs), seconds=SECONDS.get(name), tool_calls=[t[1] for t in tools],
                     max_tool_result_chars=max([r[0] for r in results.values()] or [0]), snapshots=snaps, answer=res.get("result", "")))
summ = json.load(open(os.path.join(HERE, "diet_summary.json")))
out = dict(measured="2026-10-22", client="Claude Code 2.1.295, claude-opus-5-5, effort medium, Windows 11",
           full_snapshot_claude_tokens=summ["_claude_token_count_of_full_wikipedia_snapshot"], rows=rows)
json.dump(out, open(os.path.join(HERE, "combined.json"), "w"), indent=1, ensure_ascii=False)
print(len(rows), "rows")
for r in rows:
    if r["snapshots"]: print(r["srv"], r["mode"], r["task"], r["run"], [(s["raw_snapshot_chars"], s["result_chars"], s["tokens_added_next_request"], s["blocked_by_claude_code"]) for s in r["snapshots"]])
