$B = "C:\Users\USER\Downloads\agent-test\ds28"
$VD = "C:\Users\USER\Downloads\cc-versions"
$env:CLAUDE_CONFIG_DIR = "$B\cfg"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
Remove-Item "$B\pilot2" -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force "$B\pilot2" | Out-Null
$runs = @(@("2.1.50","claude-opus-4-5"), @("2.1.150","claude-opus-4-5"), @("2.1.250","claude-opus-4-5"), @("2.1.295","claude-opus-4-5"))
foreach ($r in $runs) {
  $v=$r[0]; $m=$r[1]; $o = "$B\pilot2\$v`_$m"; New-Item -ItemType Directory -Force $o | Out-Null
  $c = "$VD\$v\node_modules\.bin\claude.cmd"
  $a = "/c `"`"$c`" -p --model $m --disallowedTools Edit Write Bash WebFetch WebSearch NotebookEdit --strict-mcp-config --output-format stream-json --verbose`""
  $t0 = Get-Date
  $p = Start-Process cmd.exe -ArgumentList $a -WorkingDirectory "C:\Users\USER\Downloads\agent-test\ds27\src\markdown" -RedirectStandardInput "$B\pilot\prompt.txt" -RedirectStandardOutput "$o\run.jsonl" -RedirectStandardError "$o\err.txt" -NoNewWindow -PassThru
  $to = -not $p.WaitForExit(900000); if ($to) { taskkill /T /F /PID $p.Id | Out-Null }
  Add-Content "$B\pilot2\summary.txt" "$v $m sec=$([int]((Get-Date)-$t0).TotalSeconds) timeout=$to"
}
Add-Content "$B\pilot2\summary.txt" "ALL DONE2"
