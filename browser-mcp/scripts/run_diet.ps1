$ErrorActionPreference = "Continue"
$root = "$env:USERPROFILE\Downloads\mcp-diet"
$diet = "$root\snapshot-diet\index.js" -replace '\\','/'
'{"mcpServers":{"pw":{"command":"cmd","args":["/c","npx","-y","@playwright/mcp@0.0.83","--headless","--isolated"]}}}' | Out-File -Encoding ascii "$root\mcp_pw_base.json"
'{"mcpServers":{"cdt":{"command":"cmd","args":["/c","npx","-y","chrome-devtools-mcp@1.11.0","--headless","--isolated"]}}}' | Out-File -Encoding ascii "$root\mcp_cdt_base.json"
"{""mcpServers"":{""pw"":{""command"":""node"",""args"":[""$diet"",""--"",""cmd"",""/c"",""npx"",""-y"",""@playwright/mcp@0.0.83"",""--headless"",""--isolated""]}}}" | Out-File -Encoding ascii "$root\mcp_pw_diet.json"
"{""mcpServers"":{""cdt"":{""command"":""node"",""args"":[""$diet"",""--"",""cmd"",""/c"",""npx"",""-y"",""chrome-devtools-mcp@1.11.0"",""--headless"",""--isolated""]}}}" | Out-File -Encoding ascii "$root\mcp_cdt_diet.json"
$tasks = @{
  "probe" = "Use only the browser tools. Open https://en.wikipedia.org/wiki/Python_(programming_language) and then take one accessibility snapshot of the whole page with the snapshot tool. Do not use any other way to read the page. Then reply with just the word done.";
  "snapread" = "Use only the browser tools, and do not run or evaluate JavaScript. Open https://en.wikipedia.org/wiki/Python_(programming_language) , take an accessibility snapshot of the page, and from what the browser tools show you, tell me who designed Python and the year it first appeared. Answer in one short line.";
  "hnsnap" = "Use only the browser tools, and do not run or evaluate JavaScript. Open https://news.ycombinator.com/ , take an accessibility snapshot of the page, and from it list the titles of the top 5 stories with their points."
}
$noScript = @{ "pw" = "mcp__pw__browser_evaluate mcp__pw__browser_run_code_unsafe"; "cdt" = "mcp__cdt__evaluate_script" }
foreach ($name in $args) {
  # name = <srv>_<mode>_<task>_r<n>, e.g. pw_diet_snapread_r1
  $srv, $mode, $tk, $rep = $name.Split("_")
  $d = "$root\runs\$name"; New-Item -ItemType Directory -Force $d | Out-Null; Push-Location $d
  $p = $tasks[$tk]
  $dis = "WebFetch WebSearch Bash Read Write Edit Glob Grep Agent"
  if ($tk -ne "probe") { $dis = "$dis " + $noScript[$srv] }
  $t0 = Get-Date
  cmd /c "claude -p `"$p`" --effort medium --output-format stream-json --verbose --mcp-config `"$root\mcp_${srv}_$mode.json`" --strict-mcp-config --allowedTools `"mcp__$srv`" --disallowedTools `"$dis`" < NUL > run.jsonl 2>&1"
  $s = [int]((Get-Date) - $t0).TotalSeconds
  $s | Out-File -Encoding ascii seconds.txt
  Pop-Location
  Write-Output "$name seconds=$s"
}
Write-Output "ALL DONE"
