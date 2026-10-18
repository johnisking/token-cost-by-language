// Minimal MCP stdio server for token-overhead measurement (TokenSave).
// Usage: node mcp_dummy.js <number_of_tools>
// Exposes N realistic-looking tools; every call returns a short fixed text.
const N = parseInt(process.argv[2] || "1", 10);
const VERBS = ["create", "update", "get", "list", "delete", "search", "archive", "assign", "comment_on", "close"];
const NOUNS = ["issue", "project", "task", "milestone", "label"];
const tools = [];
for (let i = 0; i < N; i++) {
  const v = VERBS[i % VERBS.length], n = NOUNS[Math.floor(i / VERBS.length) % NOUNS.length];
  const suffix = i >= VERBS.length * NOUNS.length ? `_${i}` : "";
  tools.push({
    name: `${v}_${n}${suffix}`,
    description: `${v.replace("_", " ")} a ${n} in the team tracker. Use this when the user asks to ${v.replace("_", " ")} a ${n}. Returns the ${n} as JSON with its id, title, status and timestamps.`,
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "ID of the workspace that owns the " + n },
        [`${n}_id`]: { type: "string", description: `ID of the ${n}; leave empty when creating a new one` },
        title: { type: "string", description: `Short title of the ${n}` },
        body: { type: "string", description: "Optional longer text in Markdown" },
        status: { type: "string", enum: ["open", "in_progress", "done"], description: "Workflow status" }
      },
      required: ["workspace_id"]
    }
  });
}
let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id === undefined) continue;
    let result;
    if (msg.method === "initialize") {
      result = { protocolVersion: (msg.params && msg.params.protocolVersion) || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "tracker", version: "1.0.0" } };
    } else if (msg.method === "tools/list") {
      result = { tools };
    } else if (msg.method === "tools/call") {
      result = { content: [{ type: "text", text: "ok" }] };
    } else if (msg.method === "ping") {
      result = {};
    } else {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } }) + "\n");
      continue;
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\n");
  }
});
