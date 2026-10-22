$root = "$env:USERPROFILE\Downloads\mcp-diet"
'{"mcpServers":{}}' | Out-File -Encoding ascii "$root\empty_mcp.json"
New-Item -ItemType Directory -Force "$root\count" | Out-Null
Set-Content "$root\count\empty.txt" "x" -Encoding utf8
foreach ($n in "empty", "pw_wiki_snapshot", "cdt_wiki_snapshot") {
  $src = if ($n -eq "empty") { "$root\count\empty.txt" } else { "$root\snapshots\$n.txt" }
  cmd /c "claude -p `"Reply with OK only.`" --output-format json --mcp-config `"$root\empty_mcp.json`" --strict-mcp-config --tools `"`" < `"$src`" > `"$root\count\$n.json`" 2>&1"
  Write-Output "$n done"
}
