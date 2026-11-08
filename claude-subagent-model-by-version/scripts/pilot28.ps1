$B = "C:\Users\USER\Downloads\agent-test\ds28"
$V = "C:\Users\USER\Downloads\cc-versions"
New-Item -ItemType Directory -Force "$B\pilot", "$B\cfg" | Out-Null
Copy-Item "$env:USERPROFILE\.claude\.credentials.json" "$B\cfg\.credentials.json" -Force
$env:CLAUDE_CONFIG_DIR = "$B\cfg"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$q = (Get-Content "C:\Users\USER\Downloads\agent-test\ds27\p_M1.txt" -Raw).Trim() + " Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself."
[IO.File]::WriteAllText("$B\pilot\prompt.txt", $q)
$vers = @(
  @{v="2.0.50"; c="$V\2.0.50\node_modules\.bin\claude.cmd"},
  @{v="2.1.150"; c="$V\2.1.150\node_modules\.bin\claude.cmd"},
  @{v="2.1.295"; c="$V\2.1.295\node_modules\.bin\claude.cmd"},
  @{v="2.1.318"; c="C:\Users\USER\Downloads\agent-test\cc318\node_modules\.bin\claude.cmd"}
)
foreach ($x in $vers) {
  $o = "$B\pilot\$($x.v)"
  New-Item -ItemType Directory -Force $o | Out-Null
  $a = "/c `"`"$($x.c)`" -p --model claude-opus-5-5 --disallowedTools Edit Write Bash WebFetch WebSearch NotebookEdit --strict-mcp-config --output-format stream-json --verbose`""
  $t0 = Get-Date
  $p = Start-Process cmd.exe -ArgumentList $a -WorkingDirectory "C:\Users\USER\Downloads\agent-test\ds27\src\markdown" -RedirectStandardInput "$B\pilot\prompt.txt" -RedirectStandardOutput "$o\run.jsonl" -RedirectStandardError "$o\err.txt" -NoNewWindow -PassThru
  $to = -not $p.WaitForExit(900000); if ($to) { taskkill /T /F /PID $p.Id | Out-Null }
  Add-Content "$B\pilot\summary.txt" "$($x.v) sec=$([int]((Get-Date)-$t0).TotalSeconds) timeout=$to"
}
Add-Content "$B\pilot\summary.txt" "ALL DONE"
