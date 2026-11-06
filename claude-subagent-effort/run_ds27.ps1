param([int]$W)
$B = "C:\Users\USER\Downloads\agent-test\ds27"
$c = "C:\Users\USER\Downloads\agent-test\cc318\node_modules\.bin\claude.cmd"
$sub = " Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself."
$eff = @{ C1 = "low"; C2 = "medium"; C3 = "high" }
$mid = @{ haiku = "claude-haiku-5-5"; opus = "claude-opus-5-5" }
$jobs = Import-Csv "$B\jobs.csv"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
for ($i = $W; $i -lt $jobs.Count; $i += 2) {
  $j = $jobs[$i]; $o = "$B\runs\$($j.name)"
  if (Test-Path "$o\done.txt") { continue }
  New-Item -ItemType Directory -Force $o | Out-Null
  $q = (Get-Content "$B\p_$($j.qid).txt" -Raw).Trim()
  if ($j.cond -ne "C0") { $q += $sub; $env:CLAUDE_CODE_SUBAGENT_EFFORT = $eff[$j.cond] } else { Remove-Item Env:CLAUDE_CODE_SUBAGENT_EFFORT -ErrorAction SilentlyContinue }
  [IO.File]::WriteAllText("$o\prompt.txt", $q)
  $args2 = "/c `"`"$c`" -p --model $($mid[$j.model]) --disallowedTools Edit Write Bash WebFetch WebSearch NotebookEdit --strict-mcp-config --output-format stream-json --verbose`""
  $t0 = Get-Date
  $p = Start-Process cmd.exe -ArgumentList $args2 -WorkingDirectory "$B\src\$($j.repo)" -RedirectStandardInput "$o\prompt.txt" -RedirectStandardOutput "$o\run.jsonl" -RedirectStandardError "$o\err.txt" -NoNewWindow -PassThru
  $to = -not $p.WaitForExit(1200000)
  if ($to) { taskkill /T /F /PID $p.Id | Out-Null }
  $sec = [int]((Get-Date) - $t0).TotalSeconds
  "seconds=$sec timeout=$to effort=$($env:CLAUDE_CODE_SUBAGENT_EFFORT) end=$(Get-Date -Format s)" | Set-Content "$o\done.txt"
  Add-Content "$B\progress_$W.txt" "$i $($j.name) $sec $to"
}
Add-Content "$B\progress_$W.txt" "ALL DONE"
