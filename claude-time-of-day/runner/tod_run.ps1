# Time-of-day quality study (2026-10-26 to 2026-11-01): the same 7 tasks for Claude Haiku 5.5, 3 runs each, 4 slots a day.
# Usage: tod_run.ps1 [-Pilot] [-Reps n] [-Tasks a,b]
param([switch]$Pilot, [int]$Reps = 3, [string]$Tasks = "")
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$base = "$env:USERPROFILE\Downloads\agent-test"
$tod = "$base\tod"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$env:DISABLE_AUTOUPDATER = "1"
$model = "claude-haiku-5-5"
$utf8 = New-Object System.Text.UTF8Encoding $false

# ---- one slot at a time ----
$lock = "$tod\running.lock"
$now = Get-Date
$slot = $(if ($Pilot) { "pilot_" } else { "" }) + $now.ToString("yyyyMMdd_HHmm")
$root = "$tod\runs\$slot"
New-Item -ItemType Directory -Force $root | Out-Null
if (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalHours
  if ($age -lt 4) { "previous slot still running ($([int]($age*60)) min): $(Get-Content $lock)" | Out-File -Encoding utf8 "$root\SKIPPED.txt"; exit }
}
$slot | Out-File -Encoding ascii $lock

# ---- tasks ----
$hard = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts_hard.json" | ConvertFrom-Json
$easy = Get-Content -Raw -Encoding UTF8 "$base\b15_prompts.json" | ConvertFrom-Json
$bugAllow = '"Bash(node:*)" "Bash(cd:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(grep:*)" "Bash(sed:*)" "Bash(wc:*)" "Bash(echo:*)" "Bash(find:*)" "Bash(npm test:*)" "Bash(npm run:*)" "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(.venv/Scripts/python:*)" "Bash(.venv\Scripts\python:*)"'
$bugDeny = '"WebFetch" "WebSearch" "Bash(npm install:*)" "Bash(npm i:*)" "Bash(npm ci:*)" "Bash(npx:*)" "Bash(curl:*)" "Bash(git fetch:*)" "Bash(git clone:*)" "Bash(.venv/Scripts/python -m pip:*)" "Bash(.venv\Scripts\python -m pip:*)" "Bash(pip:*)" "Bash(pnpm:*)"'
$T = [ordered]@{
  "q629"     = @{ base = "q629";     prompt = $easy.q629;     mode = "acceptEdits"; allow = $bugAllow; deny = $bugDeny }
  "mdit1201" = @{ base = "mdit1201"; prompt = $hard.mdit1201; mode = "acceptEdits"; allow = $bugAllow; deny = $bugDeny }
  "z6495"    = @{ base = "z6495";    prompt = $hard.z6495;    mode = "acceptEdits"; allow = $bugAllow; deny = $bugDeny }
  "z6496"    = @{ base = "z6496";    prompt = $hard.z6496;    mode = "acceptEdits"; allow = $bugAllow; deny = $bugDeny }
  "ct435"    = @{ base = "ct435";    prompt = $hard.ct435;    mode = "acceptEdits"; allow = $bugAllow; deny = $bugDeny }
  "r1"       = @{ base = "q629";     prompt = (Get-Content -Raw -Encoding UTF8 "$tod\r1_prompt.txt"); mode = "default"; allow = '"Read" "Grep" "Glob"'; deny = '"Bash" "Write" "Edit" "WebFetch" "WebSearch"' }
  "f1"       = @{ base = "";         prompt = (Get-Content -Raw -Encoding UTF8 "$tod\f1_prompt.txt"); mode = "acceptEdits"; allow = '"Bash(node:*)" "Bash(ls:*)" "Bash(cat:*)" "Write" "Edit"'; deny = '"WebFetch" "WebSearch" "Bash(npm:*)" "Bash(npx:*)" "Bash(curl:*)"' }
}
$names = @($T.Keys)
if ($Tasks) { $names = $Tasks -split "," }

# ---- slot context ----
$ctx = [ordered]@{ slot = $slot; start_local = $now.ToString("o"); start_utc = $now.ToUniversalTime().ToString("o"); weekday = $now.DayOfWeek.ToString(); pilot = [bool]$Pilot }
$ctx.claude_version = (cmd /c "claude --version" 2>&1 | Out-String).Trim()
$ctx.last_boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString("o"); $ctx.reboot_pending = (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired")
try { $ctx.status = Invoke-RestMethod -TimeoutSec 15 "https://status.anthropic.com/api/v2/summary.json" | Select-Object status, incidents, components } catch { $ctx.status_error = "$_" }
($ctx | ConvertTo-Json -Depth 8) | Out-File -Encoding utf8 "$root\slot.json"

function Probe() {
  $o = [ordered]@{}
  try { $sw = [Diagnostics.Stopwatch]::StartNew(); $c = New-Object Net.Sockets.TcpClient; $c.Connect("api.anthropic.com", 443); $sw.Stop(); $c.Close(); $o.tcp_ms = $sw.ElapsedMilliseconds } catch { $o.tcp_error = "$_" }
  # Claude Code CLI sessions started by anyone (the desktop app's own claude.exe processes are counted separately)
  $procs = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "claude.exe" -or ($_.Name -eq "node.exe" -and $_.CommandLine -match "claude-code") })
  $o.cli_sessions = @($procs | Where-Object { $_.CommandLine -match "\s-p(\s|$)|--print|claude-code" -or ($_.ExecutablePath -match "\\\.local\\bin\\") }).Count
  $o.app_procs = @($procs | Where-Object { $_.ExecutablePath -match "AnthropicClaude|WindowsApps|Claude_pzs8sxrjxfjjc" }).Count
  $o.cpu_pct = [int](Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  $o.free_mem_mb = [int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024)
  return $o
}

function Run-One($name, $rep, $order) {
  $t = $T[$name]
  $d = "$root\${name}_r$rep"
  if (Test-Path $d) { cmd /c "rmdir /s /q `"$d`"" }
  New-Item -ItemType Directory -Force "$d\work" | Out-Null
  if ($t.base -like "z*") {
    robocopy "$base\b15\base\$($t.base)" "$d\work" /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
    foreach ($nm in @("node_modules","packages\bench\node_modules","packages\docs\node_modules","packages\integration\node_modules","packages\resolution\node_modules","packages\treeshake\node_modules","packages\tsc\node_modules","packages\zod\node_modules")) {
      if (Test-Path "$base\b15\base\$($t.base)\$nm") { cmd /c "mklink /J `"$d\work\$nm`" `"$base\b15\base\$($t.base)\$nm`"" | Out-Null }
    }
  } elseif ($t.base) {
    robocopy "$base\b15\base\$($t.base)" "$d\work" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  }
  $pf = "$d\prompt.txt"
  [System.IO.File]::WriteAllText($pf, $t.prompt, $utf8)
  '{"mcpServers":{}}' | Out-File -Encoding ascii "$d\mcp.json"
  $meta = [ordered]@{ task = $name; rep = $rep; order = $order; model = $model }
  $meta.before = Probe
  Push-Location "$d\work"
  $t0 = Get-Date
  $meta.start_utc = $t0.ToUniversalTime().ToString("o")
  $cl = "claude -p --model $model --effort medium --permission-mode $($t.mode) --allowedTools $($t.allow) --disallowedTools $($t.deny) --output-format stream-json --verbose --strict-mcp-config --mcp-config `"$d\mcp.json`" < `"$pf`" > `"$d\run.jsonl`" 2> `"$d\err.txt`""
  $proc = Start-Process cmd.exe -ArgumentList "/c $cl" -WorkingDirectory "$d\work" -NoNewWindow -PassThru
  $null = $proc.Handle   # keeps the exit code readable
  if (-not $proc.WaitForExit(30 * 60 * 1000)) {   # 30-minute cap per run
    cmd /c "taskkill /T /F /PID $($proc.Id) > nul 2>&1"
    $meta.timed_out = $true
  }
  $meta.exit_code = $proc.ExitCode
  $t1 = Get-Date
  $meta.end_utc = $t1.ToUniversalTime().ToString("o")
  $meta.seconds = [math]::Round(($t1 - $t0).TotalSeconds, 1)
  if ($t.base) {
    cmd /c "git add -A > nul 2>&1"
    cmd /c "git diff --cached --binary > `"$d\changes_raw.diff`""
    cmd /c "git status --short > `"$d\status.txt`""
  } elseif (Test-Path "duration.js") { Copy-Item "duration.js" "$d\duration.js" }
  Pop-Location
  $meta.after = Probe
  ($meta | ConvertTo-Json -Depth 5) | Out-File -Encoding utf8 "$d\meta.json"
  cmd /c "rmdir /s /q `"$d\work`""   # rmdir does not follow the zod node_modules junctions
  "$slot $name r$rep order=$order seconds=$($meta.seconds) exit=$($meta.exit_code)" | Tee-Object -Append "$tod\tod.log"
}

# ---- randomised order of (task, rep), seeded by the slot time ----
$jobs = foreach ($r in 1..$Reps) { foreach ($n in $names) { [pscustomobject]@{ n = $n; r = $r } } }
$rng = New-Object System.Random ([int]$now.ToString("MMddHHmm"))
$jobs = @($jobs | ForEach-Object { [pscustomobject]@{ n = $_.n; r = $_.r; k = $rng.Next() } } | Sort-Object k)
($jobs | ForEach-Object { "$($_.n)_r$($_.r)" }) -join "," | Out-File -Encoding ascii "$root\order.txt"
$i = 0
foreach ($j in $jobs) { $i++; Run-One $j.n $j.r $i }
(Get-Date).ToUniversalTime().ToString("o") | Out-File -Encoding ascii "$root\DONE.txt"
Remove-Item $lock -ErrorAction SilentlyContinue
