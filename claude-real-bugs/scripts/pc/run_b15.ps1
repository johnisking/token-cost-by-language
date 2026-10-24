$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Claude-only bug study (2026-10-24): real bugs fixed upstream Aug to Oct 2026, run from the commit before the fix.
# Claude Code Haiku/Sonnet/Opus 5.5, medium effort, tests allowed (same permissions as limit-line tier 6b "dev").
# Each run starts from a copy of b15\base\<bug> (deps installed, fresh git repo with no upstream history).
$base = "$env:USERPROFILE\Downloads\agent-test"
$root = "$base\b15\runs"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$claudeModel = @{ "haiku" = "claude-haiku-5-5"; "sonnet" = "claude-sonnet-5-5"; "opus" = "claude-opus-5-5" }
$allow = '"Bash(node:*)" "Bash(cd:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(grep:*)" "Bash(sed:*)" "Bash(wc:*)" "Bash(echo:*)" "Bash(find:*)" "Bash(npm test:*)" "Bash(npm run:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(.venv/Scripts/python:*)" "Bash(.venv\Scripts\python:*)"'
$deny = '"WebFetch" "WebSearch" "Bash(npm install:*)" "Bash(npm i:*)" "Bash(npm ci:*)" "Bash(npx:*)" "Bash(curl:*)" "Bash(git fetch:*)" "Bash(git clone:*)" "Bash(.venv/Scripts/python -m pip:*)" "Bash(.venv\Scripts\python -m pip:*)" "Bash(pip:*)"'
$prompts = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts.json" | ConvertFrom-Json
$bugs = @("y802","h359","d699","t336","q629","i1304","y798","t599","d707","p1163","t642","d701","i1268","q624","m1204")
if ($args.Count -gt 0) { $bugs = $args[0] -split "," }
$utf8 = New-Object System.Text.UTF8Encoding $false

function Run-One($tool, $bug, $rep) {
  $name = "${tool}_${bug}_r$rep"
  $d = "$root\$name"
  if (Test-Path "$d\seconds.txt") { Write-Output "$name skip"; return }
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
  New-Item -ItemType Directory -Force "$d\work" | Out-Null
  robocopy "$base\b15\base\$bug" "$d\work" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  $pf = "$d\prompt.txt"
  [System.IO.File]::WriteAllText($pf, $prompts.$bug, $utf8)
  '{"mcpServers":{}}' | Out-File -Encoding ascii "$d\mcp.json"
  Push-Location "$d\work"
  $t0 = Get-Date
  cmd /c "claude -p --model $($claudeModel[$tool]) --effort medium --permission-mode acceptEdits --allowedTools $allow --disallowedTools $deny --output-format stream-json --verbose --strict-mcp-config --mcp-config `"$d\mcp.json`" < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  $s = [int]((Get-Date) - $t0).TotalSeconds
  git diff --binary > "$d\changes.diff"
  git status --short > "$d\status.txt"
  Pop-Location
  $s | Out-File -Encoding ascii "$d\seconds.txt"
  "$name seconds=$s" | Tee-Object -Append "$base\b15.log"
}

foreach ($rep in 1..3) {
  foreach ($bug in $bugs) {
    foreach ($t in @("haiku", "sonnet", "opus")) { Run-One $t $bug $rep }
  }
}
"ALL DONE" | Tee-Object -Append "$base\b15.log"
