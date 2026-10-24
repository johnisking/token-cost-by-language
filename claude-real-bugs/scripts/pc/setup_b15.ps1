$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Claude-only bug study (2026-10-24): build one base folder per bug at the commit before the upstream fix.
# The base has no upstream history (fresh git init), so the fix cannot be read from git.
$b = "$env:USERPROFILE\Downloads\agent-test\b15"
New-Item -ItemType Directory -Force "$b\repos", "$b\base" | Out-Null
$repos = @{ "js-yaml"="nodeca/js-yaml"; "jsdiff"="kpdecker/jsdiff"; "qs"="ljharb/qs"; "PapaParse"="mholt/PapaParse"; "markdown-it"="markdown-it/markdown-it" }
foreach ($r in $repos.Keys) {
  if (-not (Test-Path "$b\repos\$r")) { git clone -q --shallow-since=2026-07-01 "https://github.com/$($repos[$r])" "$b\repos\$r" }
}
$bugs = @(
  @("y802","js-yaml","30108cc8"), @("y798","js-yaml","e5a3ba0e"),
  @("d699","jsdiff","c207c497"), @("d707","jsdiff","b9d516f3"), @("d701","jsdiff","84726cae"),
  @("q629","qs","81e7a225"), @("q624","qs","5c1d08cd"),
  @("p1163","PapaParse","4843fc20"), @("m1204","markdown-it","5e9b1cc8")
)
foreach ($x in $bugs) {
  $id, $r, $sha = $x
  $d = "$b\base\$id"
  if (Test-Path "$b\base\$id.ready") { "$id ready"; continue }
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
  New-Item -ItemType Directory -Force $d | Out-Null
  git -C "$b\repos\$r" archive --format=tar -o "$b\$id.tar" $sha
  tar -xf "$b\$id.tar" -C $d
  Remove-Item "$b\$id.tar"
  Push-Location $d
  if ((Test-Path "package-lock.json") -and ($r -ne "jsdiff")) { cmd /c "npm ci --no-audit --no-fund --ignore-scripts > ..\$id.npm.log 2>&1" }
  else { cmd /c "npm install --no-audit --no-fund --ignore-scripts > ..\$id.npm.log 2>&1" }
  "npm exit $LASTEXITCODE" | Out-File -Append "..\$id.npm.log"
  if ($r -eq "js-yaml") { cmd /c "node support/build-dist.mjs > nul 2>&1" }
  if (-not (Select-String -Quiet -Path .gitignore -Pattern "node_modules" -ErrorAction SilentlyContinue)) { "node_modules/" | Out-File -Append -Encoding ascii .gitignore }
  git init -q; git add -A; git -c user.name=study -c user.email=study@example.com commit -q -m "source"
  Pop-Location
  "ok" | Out-File "$b\base\$id.ready"
  git -C $d status --short | Select-Object -First 3
  "$id done $(Get-Content "$b\base\$id.npm.log" -Tail 1)"
}
"SETUP DONE"
