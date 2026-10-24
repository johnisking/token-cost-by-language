$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Hard round of the Claude-only bug study (2026-10-24): 10 larger real bugs, same harness as run_b15.ps1.
$base = "$env:USERPROFILE\Downloads\agent-test"
$root = "$base\b15\runs_hard"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$claudeModel = @{ "haiku" = "claude-haiku-5-5"; "sonnet" = "claude-sonnet-5-5"; "opus" = "claude-opus-5-5" }
$allow = '"Bash(node:*)" "Bash(cd:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(grep:*)" "Bash(sed:*)" "Bash(wc:*)" "Bash(echo:*)" "Bash(find:*)" "Bash(npm test:*)" "Bash(npm run:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(.venv/Scripts/python:*)" "Bash(.venv\Scripts\python:*)"'
$deny = '"WebFetch" "WebSearch" "Bash(npm install:*)" "Bash(npm i:*)" "Bash(npm ci:*)" "Bash(npx:*)" "Bash(curl:*)" "Bash(git fetch:*)" "Bash(git clone:*)" "Bash(.venv/Scripts/python -m pip:*)" "Bash(.venv\Scripts\python -m pip:*)" "Bash(pip:*)" "Bash(pnpm:*)"'
$prompts = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts_hard.json" | ConvertFrom-Json
$bugs = @("z6495","mit","mdit1201","ct435","mk4059","pm1643","z6496","pp653","jy791","mk4051")
if ($args.Count -gt 0) { $bugs = $args[0] -split "," }
$utf8 = New-Object System.Text.UTF8Encoding $false

function Run-One($tool, $bug, $rep) {
  $name = "${tool}_${bug}_r$rep"
  $d = "$root\$name"
  if (Test-Path "$d\seconds.txt") { Write-Output "$name skip"; return }
  if (-not (Test-Path "$base\b15\base\$bug.ready")) { Write-Output "$name base missing"; return }
  if (Test-Path $d) { cmd /c "rmdir /s /q `"$d`"" }  # rmdir does not follow the node_modules junctions
  New-Item -ItemType Directory -Force "$d\work" | Out-Null
  if ($bug -like "z*") {
    # zod: pnpm node_modules are huge; copy the source and link node_modules folders to the base (agents may not install anything)
    robocopy "$base\b15\base\$bug" "$d\work" /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
    foreach ($nm in @("node_modules","packages\bench\node_modules","packages\docs\node_modules","packages\integration\node_modules","packages\resolution\node_modules","packages\treeshake\node_modules","packages\tsc\node_modules","packages\zod\node_modules")) {
      if (Test-Path "$base\b15\base\$bug\$nm") { cmd /c "mklink /J `"$d\work\$nm`" `"$base\b15\base\$bug\$nm`"" | Out-Null }
    }
  } else {
    robocopy "$base\b15\base\$bug" "$d\work" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  }
  $pf = "$d\prompt.txt"
  [System.IO.File]::WriteAllText($pf, $prompts.$bug, $utf8)
  '{"mcpServers":{}}' | Out-File -Encoding ascii "$d\mcp.json"
  Push-Location "$d\work"
  $t0 = Get-Date
  cmd /c "claude -p --model $($claudeModel[$tool]) --effort medium --permission-mode acceptEdits --allowedTools $allow --disallowedTools $deny --output-format stream-json --verbose --strict-mcp-config --mcp-config `"$d\mcp.json`" < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  $s = [int]((Get-Date) - $t0).TotalSeconds
  cmd /c "git diff --binary > `"$d\changes_raw.diff`""
  cmd /c "git status --short > `"$d\status.txt`""
  Pop-Location
  $s | Out-File -Encoding ascii "$d\seconds.txt"
  "$name seconds=$s" | Tee-Object -Append "$base\b15_hard.log"
}

foreach ($rep in 1..3) {
  foreach ($bug in $bugs) {
    foreach ($t in @("haiku", "sonnet", "opus")) { Run-One $t $bug $rep }
  }
}
"ALL DONE" | Tee-Object -Append "$base\b15_hard.log"
