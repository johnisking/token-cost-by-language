param([int]$W)
$B = "C:\Users\USER\Downloads\agent-test\ds28"
$VD = "C:\Users\USER\Downloads\cc-versions"
$P27 = "C:\Users\USER\Downloads\agent-test\ds27"
$sub = " Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself."
$jobs = Import-Csv "$B\jobs.csv"
$env:CLAUDE_CONFIG_DIR = "$B\cfg"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
for ($i = $W; $i -lt $jobs.Count; $i += 2) {
  $j = $jobs[$i]; $o = "$B\runs\$($j.name)"
  if (Test-Path "$o\done.txt") { continue }
  New-Item -ItemType Directory -Force $o | Out-Null
  $c = if ($j.version -eq "2.1.318") { "C:\Users\USER\Downloads\agent-test\cc318\node_modules\.bin\claude.cmd" } else { "$VD\$($j.version)\node_modules\.bin\claude.cmd" }
  $q = (Get-Content "$P27\p_$($j.qid).txt" -Raw).Trim() + $sub
  [IO.File]::WriteAllText("$o\prompt.txt", $q)
  if ($j.submodel -eq "haiku") { $env:CLAUDE_CODE_SUBAGENT_MODEL = "claude-haiku-5-5" } else { Remove-Item Env:CLAUDE_CODE_SUBAGENT_MODEL -ErrorAction SilentlyContinue }
  $repo = @{U="undici";F="fastify";C="cachetools";M="markdown";A="anyio";Z="zod"}[$j.qid.Substring(0,1)]
  $a = "/c `"`"$c`" -p --model $($j.model) --disallowedTools Edit Write Bash WebFetch WebSearch NotebookEdit --strict-mcp-config --output-format stream-json --verbose`""
  $t0 = Get-Date
  $p = Start-Process cmd.exe -ArgumentList $a -WorkingDirectory "$P27\src\$repo" -RedirectStandardInput "$o\prompt.txt" -RedirectStandardOutput "$o\run.jsonl" -RedirectStandardError "$o\err.txt" -NoNewWindow -PassThru
  $to = -not $p.WaitForExit(1200000)
  if ($to) { taskkill /T /F /PID $p.Id | Out-Null }
  "seconds=$([int]((Get-Date) - $t0).TotalSeconds) timeout=$to submodel=$($env:CLAUDE_CODE_SUBAGENT_MODEL) end=$(Get-Date -Format s)" | Set-Content "$o\done.txt"
  Add-Content "$B\progress_$W.txt" "$i $($j.name) $([int]((Get-Date) - $t0).TotalSeconds) $to"
}
Add-Content "$B\progress_$W.txt" "ALL DONE"
