"""From the raw stream-json logs, take the usage of the FIRST assistant message (the first model request),
so versions where the model also made a tool call (num_turns 2) are compared on the same request. -> first_call.json"""
import glob, json, os, re
BASE = os.path.dirname(os.path.abspath(__file__))
out = {}
for f in sorted(glob.glob(os.path.join(BASE, "raw", "*.txt"))):
    m = re.match(r"(.+?)_(clean|connectors)_(\d)(_json)?\.txt$", os.path.basename(f))
    if not m or m.group(4): continue
    v, arm, rep = m.group(1), m.group(2), int(m.group(3))
    first, n_asst, tools_used = None, 0, []
    for line in open(f, encoding="utf-8", errors="replace"):
        try: j = json.loads(line)
        except Exception: continue
        if j.get("type") == "assistant":
            msg = j.get("message") or {}
            u = msg.get("usage") or {}
            if first is None and u: first = u
            n_asst += 1
            for c in msg.get("content") or []:
                if isinstance(c, dict) and c.get("type") == "tool_use": tools_used.append(c.get("name"))
    if first:
        tot = sum(first.get(k, 0) or 0 for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
        out.setdefault(arm, {}).setdefault(v, []).append({"rep": rep, "first_call_input": tot, "assistant_msgs": n_asst, "tools_used": tools_used})
json.dump(out, open(os.path.join(BASE, "first_call.json"), "w"), indent=1)
for arm in out:
    for v in sorted(out[arm], key=lambda v: tuple(map(int, v.split(".")))):
        print(arm, v, [x["first_call_input"] for x in out[arm][v]], [x["tools_used"] for x in out[arm][v]][:1])
