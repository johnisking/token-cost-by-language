param([int]$W = 0)
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Fable 5.2 vs 5.1 vs Opus 5.5 on the 25 real bugs of dataset 25 (pre-registered 2026-11-13, token-cost-by-language/claude-fable-5-2-real-bugs).
# Same harness as run_b15.ps1 / run_hard.ps1, but Claude Code 2.1.322 (local copy) and jobs.csv order (seed 52). Worker W runs rows with worker == W.
$base = "$env:USERPROFILE\Downloads\agent-test"
$root = "$base\f52\runs"
$c = "$base\cc322\node_modules\.bin\claude.cmd"
$log = "$base\f52\f52.log"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$mid = @{ "f52" = "claude-fable-5-2"; "f51" = "claude-fable-5-1"; "opus" = "claude-opus-5-5" }
$allow = '"Bash(node:*)" "Bash(cd:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(grep:*)" "Bash(sed:*)" "Bash(wc:*)" "Bash(echo:*)" "Bash(find:*)" "Bash(npm test:*)" "Bash(npm run:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(.venv/Scripts/python:*)" "Bash(.venv\Scripts\python:*)"'
$denyE = '"WebFetch" "WebSearch" "Bash(npm install:*)" "Bash(npm i:*)" "Bash(npm ci:*)" "Bash(npx:*)" "Bash(curl:*)" "Bash(git fetch:*)" "Bash(git clone:*)" "Bash(.venv/Scripts/python -m pip:*)" "Bash(.venv\Scripts\python -m pip:*)" "Bash(pip:*)"'
$denyH = $denyE + ' "Bash(pnpm:*)"'
$pE = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts.json" | ConvertFrom-Json
$pH = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts_hard.json" | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding $false
$jobs = Import-Csv "$base\f52\jobs.csv" | Where-Object { [int]$_.worker -eq $W }

foreach ($j in $jobs) {
  if (Test-Path "$base\f52\STOP") { "W$W stop file seen" | Tee-Object -Append $log; break }
  $bug = $j.bug; $name = "$($j.model)_${bug}_r$($j.rep)"; $d = "$root\$name"
  if (Test-Path "$d\seconds.txt") { continue }
  if (Test-Path $d) { cmd /c "rmdir /s /q `"$d`"" }
  New-Item -ItemType Directory -Force "$d\work" | Out-Null
  if ($bug -like "z*") {
    robocopy "$base\b15\base\$bug" "$d\work" /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
    foreach ($nm in @("node_modules","packages\bench\node_modules","packages\docs\node_modules","packages\integration\node_modules","packages\resolution\node_modules","packages\treeshake\node_modules","packages\tsc\node_modules","packages\zod\node_modules")) {
      if (Test-Path "$base\b15\base\$bug\$nm") { cmd /c "mklink /J `"$d\work\$nm`" `"$base\b15\base\$bug\$nm`"" | Out-Null }
    }
  } else {
    robocopy "$base\b15\base\$bug" "$d\work" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  }
  if ($j.round -eq "hard") { $prompt = $pH.$bug; $deny = $denyH } else { $prompt = $pE.$bug; $deny = $denyE }
  $pf = "$d\prompt.txt"
  [System.IO.File]::WriteAllText($pf, $prompt, $utf8)
  '{"mcpServers":{}}' | Out-File -Encoding ascii "$d\mcp.json"
  Push-Location "$d\work"
  $t0 = Get-Date
  cmd /c "`"$c`" -p --model $($mid[$j.model]) --effort medium --permission-mode acceptEdits --allowedTools $allow --disallowedTools $deny --output-format stream-json --verbose --strict-mcp-config --mcp-config `"$d\mcp.json`" < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  $s = [int]((Get-Date) - $t0).TotalSeconds
  cmd /c "git diff --binary > `"$d\changes_raw.diff`""
  cmd /c "git status --short > `"$d\status.txt`""
  Pop-Location
  $last = (Get-Content "$d\run.jsonl" -Tail 1 -ErrorAction SilentlyContinue)
  if ($last -match '"is_error":true' -and $last -match 'limit|authenticate|OAuth|rate') {
    # usage limit or login error: keep the folder for the record, do not mark done, stop this worker
    Move-Item $d "$base\f52\failed_${name}_$(Get-Date -Format HHmmss)" -Force
    "W$W $name FAILED (limit/auth) at $(Get-Date -Format s), worker stopped" | Tee-Object -Append $log
    break
  }
  $s | Out-File -Encoding ascii "$d\seconds.txt"
  "W$W $name seconds=$s end=$(Get-Date -Format s)" | Tee-Object -Append $log
}
"W$W DONE $(Get-Date -Format s)" | Tee-Object -Append $log
