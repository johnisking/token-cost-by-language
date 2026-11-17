$ErrorActionPreference = "Continue"
# Dataset 8 v2 (2026-11-17): Cursor CLI baseline tokens (MCP 0/1/10/30 x2) + brick-breaker task x2.
# Same prompts as run_baseline.ps1 / run_task.ps1. Cursor free plan, model Auto.
$root = "$env:USERPROFILE\Downloads\agent-test"
$out = "$root\cursor_v2"
$server = "$root\mcp_dummy.js"
$cursor = "$env:LOCALAPPDATA\cursor-agent\cursor-agent.cmd"
$log = "$out\cursor_v2.log"
New-Item -ItemType Directory -Force $out | Out-Null
& $cursor --version 2>&1 | Out-File -Encoding utf8 "$out\version.txt"
$prompt = "Reply with the single word OK."
foreach ($rep in 1, 2) {
  foreach ($n in 0, 1, 10, 30) {
    $d = "$out\base_n${n}_r$rep"
    if (Test-Path "$d\run.jsonl") { continue }
    New-Item -ItemType Directory -Force "$d\.cursor" | Out-Null; Push-Location $d
    if ($n -gt 0) { ('{"mcpServers":{"tracker":{"command":"node","args":["' + ($server -replace '\\','\\') + '","' + $n + '"]}}}') | Out-File -Encoding ascii .cursor\mcp.json }
    cmd /c "`"$cursor`" -p --output-format stream-json --trust --approve-mcps `"$prompt`" < NUL > run.jsonl 2>&1"
    Pop-Location
    "base n=$n r=$rep done $(Get-Date -Format HH:mm:ss)" | Out-File -Append -Encoding utf8 $log
  }
}
$task = "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."
foreach ($rep in 1, 2) {
  $d = "$out\task_r$rep"
  if (Test-Path "$d\seconds.txt") { continue }
  New-Item -ItemType Directory -Force $d | Out-Null; Push-Location $d
  $t0 = Get-Date
  cmd /c "`"$cursor`" -p --force --output-format stream-json --trust `"$task`" < NUL > ..\task_r$rep.jsonl 2>&1"
  $s = [int]((Get-Date) - $t0).TotalSeconds
  Pop-Location
  $s | Out-File -Encoding ascii "$d\seconds.txt"
  "task r=$rep seconds=$s $(Get-Date -Format HH:mm:ss)" | Out-File -Append -Encoding utf8 $log
}
"ALL DONE" | Out-File -Append -Encoding utf8 $log
