$B = "C:\Users\USER\Downloads\agent-test\ds28"
$VD = "C:\Users\USER\Downloads\cc-versions"
$P27 = "C:\Users\USER\Downloads\agent-test\ds27"
$sub = " Use subagents (the Explore agent) for the searching, in parallel where it helps, and write the final answer yourself."
$env:CLAUDE_CONFIG_DIR = "$B\cfg"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$log = "$B\stage2.log"
function Run1($exe, $model, $qid, $out, $envs) {
  New-Item -ItemType Directory -Force $out | Out-Null
  $q = (Get-Content "$P27\p_$qid.txt" -Raw).Trim() + $sub
  [IO.File]::WriteAllText("$out\prompt.txt", $q)
  foreach ($k in @("CLAUDE_CODE_SUBAGENT_MODEL","CLAUDE_CODE_SUBAGENT_MODEL_FORCE")) { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
  foreach ($k in $envs.Keys) { Set-Item "Env:$k" $envs[$k] }
  $repo = @{U="undici";F="fastify";C="cachetools";M="markdown";A="anyio";Z="zod"}[$qid.Substring(0,1)]
  $a = "/c `"`"$exe`" -p --model $model --disallowedTools Edit Write Bash WebFetch WebSearch NotebookEdit --strict-mcp-config --output-format stream-json --verbose`""
  $t0 = Get-Date
  $p = Start-Process cmd.exe -ArgumentList $a -WorkingDirectory "$P27\src\$repo" -RedirectStandardInput "$out\prompt.txt" -RedirectStandardOutput "$out\run.jsonl" -RedirectStandardError "$out\err.txt" -NoNewWindow -PassThru
  $to = -not $p.WaitForExit(1200000); if ($to) { taskkill /T /F /PID $p.Id | Out-Null }
  "seconds=$([int]((Get-Date)-$t0).TotalSeconds) timeout=$to env=$(($envs.GetEnumerator() | % { $_.Key + '=' + $_.Value }) -join ';') end=$(Get-Date -Format s)" | Set-Content "$out\done.txt"
  foreach ($k in $envs.Keys) { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
  if (Select-String -Path "$out\run.jsonl" -Pattern "hit your|Failed to authenticate" -Quiet) { Add-Content $log "STOP: limit/auth at $out"; exit 1 }
}
function Ensure($v) {
  $exe = "$VD\$v\node_modules\.bin\claude.cmd"
  if (-not (Test-Path $exe)) { New-Item -ItemType Directory -Force "$VD\$v" | Out-Null; cmd /c "npm install --prefix `"$VD\$v`" @anthropic-ai/claude-code@$v --no-audit --no-fund" | Out-Null }
  return $exe
}
function IsHaiku($o) {
  $res = Get-Content "$o\run.jsonl" | ? { $_ -match '"type":"result"' } | select -Last 1 | ConvertFrom-Json
  return [bool](($res.modelUsage.PSObject.Properties.Name) -match 'haiku')
}
# 1) bisection, corrected (stage 2 used a regex that never matched; all its probes were Haiku)
$L = @("2.1.187","2.1.190","2.1.191","2.1.193","2.1.195","2.1.196","2.1.197","2.1.198","2.1.199")
$lo = -1; $hi = $L.Count
while ($hi - $lo -gt 1) {
  $mid = [int][math]::Floor(($lo + $hi) / 2); $v = $L[$mid]
  $exe = Ensure $v
  $o = "$B\bisect\$v"
  if (-not (Test-Path "$o\done.txt")) { Run1 $exe "claude-opus-4-5" "M1" $o @{} }
  $haiku = IsHaiku $o
  Add-Content $log "bisect3 $v haiku=$haiku"
  if ($haiku) { $lo = $mid } else { $hi = $mid }
}
$vlo = if ($lo -ge 0) { $L[$lo] } else { "2.1.186" }; $vhi = if ($hi -lt $L.Count) { $L[$hi] } else { "2.1.200" }
Add-Content $log "switch3 between $vlo and $vhi"
foreach ($v in @($vlo, $vhi)) { if ($v -eq "2.1.200") { continue }
  $exe = Ensure $v
  foreach ($q in @("M1","U1")) { foreach ($r in 1,2) { $o = "$B\runs\A_$v`_$q`_r$r"; if (-not (Test-Path "$o\done.txt")) { Run1 $exe "claude-opus-4-5" $q $o @{} } } } }
# 2) Part D: Part B set with CLAUDE_CODE_SUBAGENT_MODEL=haiku + FORCE=1 (Part C setting c)
$c318 = "C:\Users\USER\Downloads\agent-test\cc318\node_modules\.bin\claude.cmd"
$QS = @("U1","U2","F1","F2","C1","C2","M1","M2","A1","A2","Z1","Z2")
$D = @(); foreach ($q in $QS) { foreach ($r in 1,2,3) { $D += ,@($q,$r) } }
foreach ($d in $D) { $o = "$B\runs\D_force_$($d[0])_r$($d[1])"; if (-not (Test-Path "$o\done.txt")) { Run1 $c318 "claude-opus-5-5" $d[0] $o @{CLAUDE_CODE_SUBAGENT_MODEL="haiku"; CLAUDE_CODE_SUBAGENT_MODEL_FORCE="1"} } }
Add-Content $log "STAGE3 DONE"
