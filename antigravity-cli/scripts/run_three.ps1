$ErrorActionPreference = "Continue"
$root = "$env:USERPROFILE\Downloads\agent-test\three"
New-Item -ItemType Directory -Force $root | Out-Null
$server = "$env:USERPROFILE\Downloads\agent-test\mcp_dummy.js"
$codex = "$env:USERPROFILE\.codex\plugins\.plugin-appserver\codex.exe"
$agy = "$env:LOCALAPPDATA\agy\bin\agy.exe"
$agyMcp = "$env:USERPROFILE\.gemini\config\mcp_config.json"
$agyModel = @{ "agyg" = "gemini-4-argon-medium"; "agyo" = "claude-opus-5-5-medium" }
$ok = "Reply with the single word OK."
$game = "Make a brick-breaker game that runs in the browser as a single file named index.html in the current folder. It needs 2 levels, a score display and 3 lives, and it must be playable with the keyboard and the mouse. Write the file and finish."
$srvJson = { param($n) '{"mcpServers":{"tracker":{"command":"node","args":["' + ($server -replace '\\','\\') + '","' + $n + '"]}}}' }

function Run-One($tool, $kind, $n, $rep) {
  # kind: base (prompt OK with n MCP tools) or game
  $name = if ($kind -eq "base") { "${tool}_n${n}_r$rep" } else { "${tool}_game_r$rep" }
  $d = "$root\$name"; New-Item -ItemType Directory -Force $d | Out-Null; Push-Location $d
  $t0 = Get-Date
  if ($tool -eq "claude") {
    if ($kind -eq "base") {
      if ($n -eq 0) { '{"mcpServers":{}}' | Out-File -Encoding ascii mcp.json } else { (& $srvJson $n) | Out-File -Encoding ascii mcp.json }
      cmd /c "claude -p `"$ok`" --output-format json --mcp-config mcp.json --strict-mcp-config < NUL > run.json 2>&1"
    } else {
      '{"mcpServers":{}}' | Out-File -Encoding ascii mcp.json
      cmd /c "claude -p `"$game`" --effort medium --permission-mode acceptEdits --output-format json --mcp-config mcp.json --strict-mcp-config < NUL > run.json 2>&1"
    }
  } elseif ($tool -eq "codex") {
    if ($kind -eq "base") {
      if ($n -eq 0) { cmd /c "`"$codex`" exec --json --skip-git-repo-check -s read-only -c model_reasoning_effort=`"low`" `"$ok`" < NUL > run.jsonl 2>&1" }
      else { cmd /c "`"$codex`" exec --json --skip-git-repo-check -s read-only -c model_reasoning_effort=`"low`" -c `"mcp_servers.tracker.command='node'`" -c `"mcp_servers.tracker.args=['$server','$n']`" `"$ok`" < NUL > run.jsonl 2>&1" }
    } else {
      cmd /c "`"$codex`" exec --json --skip-git-repo-check -s workspace-write -c model_reasoning_effort=`"medium`" `"$game`" < NUL > run.jsonl 2>&1"
    }
  } else {
    $m = $agyModel[$tool]
    if ($kind -eq "base") {
      if ($n -eq 0) { '{"mcpServers":{}}' | Out-File -Encoding ascii $agyMcp } else { (& $srvJson $n) | Out-File -Encoding ascii $agyMcp }
      cmd /c "`"$agy`" -p `"$ok`" --output-format json --model $m < NUL > run.json 2>&1"
      '{"mcpServers":{}}' | Out-File -Encoding ascii $agyMcp
    } else {
      '{"mcpServers":{}}' | Out-File -Encoding ascii $agyMcp
      cmd /c "`"$agy`" -p `"$game`" --output-format json --model $m --mode accept-edits --print-timeout 15m < NUL > run.json 2>&1"
    }
  }
  $s = [int]((Get-Date) - $t0).TotalSeconds
  $s | Out-File -Encoding ascii seconds.txt
  Pop-Location
  Write-Output "$name seconds=$s"
}

$tools = @("claude", "codex", "agyg", "agyo")
foreach ($rep in 1, 2) { foreach ($n in 0, 1, 10, 30) { foreach ($t in $tools) { Run-One $t "base" $n $rep } } }
foreach ($rep in 1, 2, 3) { foreach ($t in $tools) { Run-One $t "game" 0 $rep } }
'{"mcpServers":{}}' | Out-File -Encoding ascii $agyMcp
Write-Output "ALL DONE"
