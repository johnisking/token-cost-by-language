$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Limit line tier 6b (2026-10-24): the hard marked bug (t3) only.
#  - "notest": same setup as tier 6 (no node_modules, Claude Code acceptEdits without shell), runs r3-r5 added to r1-r2.
#  - "dev": node_modules preinstalled (npm ci, checked free of the upstream fix), git repo for diffs, prompt allows running tests.
#    Claude Code may run node, npm test/run and read-only git; npm install/ci, npx and web tools are denied.
#    Codex: workspace-write sandbox as before (can run commands, no network).
# Tools: Claude Code Haiku/Sonnet/Opus 5.5 and Codex gpt-6-luna, medium effort. Gemini waits for its quota.
$base = "$env:USERPROFILE\Downloads\agent-test"
$root = "$base\limit"
$codex = "$env:USERPROFILE\.codex\plugins\.plugin-appserver\codex.exe"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$tools = @("haiku", "sonnet", "opus", "codex")
$claudeModel = @{ "haiku" = "claude-haiku-5-5"; "sonnet" = "claude-sonnet-5-5"; "opus" = "claude-opus-5-5" }
$allow = '"Bash(node:*)" "Bash(npm test:*)" "Bash(npm run:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(git show:*)"'
$deny = '"WebFetch" "WebSearch" "Bash(npm install:*)" "Bash(npm i:*)" "Bash(npm ci:*)" "Bash(npx:*)" "Bash(curl:*)" "Bash(git fetch:*)" "Bash(git clone:*)"'

function Run-One($tool, $mode, $rep) {
  if ($mode -eq "dev") { $name = "${tool}dev_t6t3_r$rep"; $src = "$base\limit6_dev\marked_t3"; $pin = "$base\limit_prompts\tier6_t3_dev.txt" }
  else { $name = "${tool}_t6t3_r$rep"; $src = "$base\limit6_base\marked_t3"; $pin = "$base\limit_prompts\tier6_t3.txt" }
  $d = "$root\$name"
  if (Test-Path "$d\seconds.txt") { Write-Output "$name skip"; return }
  New-Item -ItemType Directory -Force "$d\work" | Out-Null
  robocopy $src "$d\work" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  $pf = "$d\prompt.txt"
  Copy-Item $pin $pf
  Push-Location "$d\work"
  $t0 = Get-Date
  if ($claudeModel.ContainsKey($tool)) {
    '{"mcpServers":{}}' | Out-File -Encoding ascii "$d\mcp.json"
    $extra = ""
    if ($mode -eq "dev") { $extra = "--allowedTools $allow --disallowedTools $deny" }
    cmd /c "claude -p --model $($claudeModel[$tool]) --effort medium --permission-mode acceptEdits $extra --output-format stream-json --verbose --strict-mcp-config --mcp-config `"$d\mcp.json`" < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  } else {
    cmd /c "`"$codex`" exec --json --skip-git-repo-check -s workspace-write -c model_reasoning_effort=`"medium`" - < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  }
  $s = [int]((Get-Date) - $t0).TotalSeconds
  Pop-Location
  $s | Out-File -Encoding ascii "$d\seconds.txt"
  "$name seconds=$s" | Tee-Object -Append "$base\limit6b.log"
}

foreach ($rep in 1..5) {
  foreach ($t in $tools) {
    Run-One $t "dev" $rep
    if ($rep -ge 3) { Run-One $t "notest" $rep }
  }
}
"ALL DONE" | Tee-Object -Append "$base\limit6b.log"
