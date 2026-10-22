"""Parse Claude Code stream-json logs of Blender MCP runs into one row per run.
Usage: python3 parse_blender.py <runs_dir> > rows.json
"""
import json, sys, os, glob, base64, struct

PRICE = {"in": 5, "out": 25}  # not used; cost comes from the log


def png_size(b64):
    try:
        raw = base64.b64decode(b64[:64] + "=" * (-len(b64[:64]) % 4))
        if raw[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", raw[16:24])
    except Exception:
        pass
    return None


def img_tokens(w, h):
    s = min(1.0, 1568 / max(w, h))  # Claude scales the long side down to 1568
    return round((w * s) * (h * s) / 750)


def parse(path):
    seen, reqs, uses, results = set(), [], {}, {}
    res = None
    for line in open(path, encoding="utf-8", errors="replace"):
        try:
            j = json.loads(line)
        except Exception:
            continue
        t = j.get("type")
        if t == "assistant":
            m = j["message"]; u = m.get("usage", {})
            if m.get("id") not in seen:
                seen.add(m.get("id"))
                reqs.append(u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0))
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    uses[c["id"]] = {"name": c["name"].replace("mcp__blender__", ""), "input": c.get("input", {})}
        elif t == "user":
            cont = j["message"].get("content")
            for c in cont if isinstance(cont, list) else []:
                if c.get("type") != "tool_result":
                    continue
                cc = c.get("content"); text, imgs = 0, []
                if isinstance(cc, str):
                    text = len(cc)
                else:
                    for x in cc or []:
                        if x.get("type") == "text":
                            text += len(x.get("text", ""))
                        elif x.get("type") == "image":
                            sz = png_size(x.get("source", {}).get("data", ""))
                            imgs.append(sz)
                results[c["tool_use_id"]] = {"text_chars": text, "images": imgs, "error": bool(c.get("is_error"))}
        elif t == "result":
            res = j
    return reqs, uses, results, res


def row(run_dir):
    name = os.path.basename(run_dir)
    mode, task, rep = name.split("_")
    reqs, uses, results, res = parse(os.path.join(run_dir, "run.jsonl"))
    if not res:
        return {"run": name, "mode": mode, "task": task, "rep": rep, "missing_result": True}
    mu = res.get("modelUsage", {})
    imgs = [sz for r in results.values() for sz in r["images"]]
    calls = [uses[k]["name"] for k in uses]
    up = sum(len(str(u["input"].get("user_prompt", ""))) for u in uses.values())
    sec = open(os.path.join(run_dir, "seconds.txt")).read().strip() if os.path.exists(os.path.join(run_dir, "seconds.txt")) else ""
    too_big = sum(1 for line in open(os.path.join(run_dir, "run.jsonl"), encoding="utf-8", errors="replace") if "exceeds maximum allowed tokens" in line)
    return {
        "run": name, "mode": mode, "task": task, "rep": int(rep[1:]),
        "input_tokens": sum(v["inputTokens"] + v["cacheReadInputTokens"] + v["cacheCreationInputTokens"] for v in mu.values()),
        "output_tokens": sum(v["outputTokens"] for v in mu.values()),
        "api_cost_usd": round(res.get("total_cost_usd", 0), 4),
        "requests": len(reqs), "max_request_input": max(reqs) if reqs else 0,
        "seconds": int(sec) if sec.isdigit() else None,
        "tool_calls": len(calls), "calls": calls,
        "max_text_result_chars": max([r["text_chars"] for r in results.values()] or [0]),
        "images": len(imgs), "image_sizes": [list(s) if s else None for s in imgs],
        "image_tokens_est": sum(img_tokens(*s) for s in imgs if s),
        "user_prompt_chars": up,
        "refused_too_large": too_big > 0,
        "tool_errors": sum(1 for r in results.values() if r["error"]),
        "answer": (res.get("result") or "")[:400],
        "is_error": res.get("is_error", False),
    }


if __name__ == "__main__":
    rows = [row(d) for d in sorted(glob.glob(os.path.join(sys.argv[1], "*_*_r*"))) if os.path.exists(os.path.join(d, "run.jsonl"))]
    json.dump(rows, sys.stdout, indent=1, ensure_ascii=False)
