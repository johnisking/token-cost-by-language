$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Python bugs for the Claude-only bug study. Each base gets its own .venv (pytest etc.); a relative .pth file puts
# the project's source on the path, so the copy in each run folder imports its own (edited) code.
$b = "$env:USERPROFILE\Downloads\agent-test\b15"
$py = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
$repos = @{ "humanize"="python-humanize/humanize"; "tomlkit"="python-poetry/tomlkit"; "more-itertools"="more-itertools/more-itertools" }
foreach ($r in $repos.Keys) {
  if (-not (Test-Path "$b\repos\$r")) { git clone -q --shallow-since=2026-07-01 "https://github.com/$($repos[$r])" "$b\repos\$r" }
}
$bugs = @(@("h359","humanize","984526c0","../../../src","pytest pytest-benchmark freezegun"),
  @("t336","tomlkit","0518af25","../../..","pytest pyyaml"), @("t599","tomlkit","88aa4b1c","../../..","pytest pyyaml"),
  @("t642","tomlkit","8c30fc17","../../..","pytest pyyaml"),
  @("i1304","more-itertools","790bb0bb","../../..","pytest"), @("i1268","more-itertools","1da45ae4","../../..","pytest"))
foreach ($x in $bugs) {
  $id, $r, $sha, $pth, $pkgs = $x
  $d = "$b\base\$id"
  if (Test-Path "$b\base\$id.ready") { "$id ready"; continue }
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
  New-Item -ItemType Directory -Force $d | Out-Null
  git -c core.autocrlf=false -C "$b\repos\$r" archive --format=tar -o "$b\$id.tar" $sha
  tar -xf "$b\$id.tar" -C $d
  Remove-Item "$b\$id.tar"
  & $py -m venv "$d\.venv"
  & "$d\.venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check $pkgs.Split(" ") 2>&1 | Select-Object -Last 2
  [System.IO.File]::WriteAllText("$d\.venv\Lib\site-packages\project_src.pth", "$pth`n")
  if ($id -eq "h359") { [System.IO.File]::WriteAllText("$d\src\humanize\_version.py", "__version__ = version = `"4.15.0`"`n") }
  Push-Location $d
  if (-not (Select-String -Quiet -Path .gitignore -Pattern "^\.venv" -ErrorAction SilentlyContinue)) { ".venv/" | Out-File -Append -Encoding ascii .gitignore }
  git init -q; git config core.autocrlf false; git add -A 2>$null; git -c user.name=study -c user.email=study@example.com commit -q -m "source"
  $t = & ".venv\Scripts\python.exe" -m pytest -q -p no:cacheprovider --ignore=tests/test_toml_tests.py tests 2>&1 | Select-Object -Last 1
  "$id tests: $t | status=" + ((git status --short | Measure-Object).Count)
  Pop-Location
  "ok" | Out-File "$b\base\$id.ready"
}
"PY SETUP DONE"
