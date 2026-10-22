$ErrorActionPreference = "Continue"
$root = "$env:USERPROFILE\Downloads\mcp-diet"
New-Item -ItemType Directory -Force "$root\runs" | Out-Null
'{"mcpServers":{"pw":{"command":"cmd","args":["/c","npx","-y","@playwright/mcp@0.0.83","--headless","--isolated"]}}}' | Out-File -Encoding ascii "$root\mcp_pw.json"
'{"mcpServers":{"cdt":{"command":"cmd","args":["/c","npx","-y","chrome-devtools-mcp@1.11.0","--headless","--isolated"]}}}' | Out-File -Encoding ascii "$root\mcp_cdt.json"
$tasks = @{
  "todo" = "Use only the browser tools. Open https://demo.playwright.dev/todomvc/ . Add three todos: 'buy milk', 'write report', 'call mom'. Mark 'write report' as completed. Then tell me how many items are left according to the page. Answer in one short line.";
  "wiki" = "Use only the browser tools. Open https://en.wikipedia.org/wiki/Python_(programming_language) . From the page, tell me who designed Python and the year it first appeared. Answer in one short line.";
  "hn" = "Use only the browser tools. Open https://news.ycombinator.com/ . List the titles of the top 5 stories with their points, as they appear on the page right now.";
  "hist" = "Use only the browser tools. Open https://en.wikipedia.org/wiki/History_of_Python . From the version table on that page, list the release dates of Python 3.10, 3.11, 3.12, 3.13 and 3.14.";
  "probe" = "Use only the browser tools. Open https://en.wikipedia.org/wiki/Python_(programming_language) and then take one accessibility snapshot of the whole page with the snapshot tool. Do not use any other way to read the page. Then reply with just the word done."
}
$only = $args
foreach ($srv in "pw", "cdt") {
  foreach ($tk in "todo", "wiki", "hn", "hist", "probe") {
    foreach ($rep in 1, 2) {
      $name = "${srv}_${tk}_r$rep"
      if ($only.Count -gt 0 -and -not ($only -contains $name)) { continue }
      $d = "$root\runs\$name"; New-Item -ItemType Directory -Force $d | Out-Null; Push-Location $d
      $p = $tasks[$tk]
      $t0 = Get-Date
      cmd /c "claude -p `"$p`" --effort medium --output-format stream-json --verbose --mcp-config `"$root\mcp_$srv.json`" --strict-mcp-config --allowedTools `"mcp__$srv`" --disallowedTools `"WebFetch WebSearch Bash Read Write Edit Glob Grep Agent`" < NUL > run.jsonl 2>&1"
      $s = [int]((Get-Date) - $t0).TotalSeconds
      $s | Out-File -Encoding ascii seconds.txt
      Pop-Location
      Write-Output "$name seconds=$s"
    }
  }
}
Write-Output "ALL DONE"

