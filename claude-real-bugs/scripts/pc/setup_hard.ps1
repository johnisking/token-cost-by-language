$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Hard round of the Claude-only bug study (2026-10-24): 10 bases at the commit before the upstream fix, LF endings,
# deps installed, fresh git repo with no upstream history.
$b = "$env:USERPROFILE\Downloads\agent-test\b15"
$py = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
$repos = @{ "zod"="colinhacks/zod"; "more-itertools"="more-itertools/more-itertools"; "cachetools"="tkem/cachetools"; "markdown"="Python-Markdown/markdown";
  "pyparsing"="pyparsing/pyparsing"; "markdown-it"="markdown-it/markdown-it"; "js-yaml"="nodeca/js-yaml"; "marked"="markedjs/marked" }
foreach ($r in $repos.Keys) {
  if (-not (Test-Path "$b\repos\$r")) { git clone -q --shallow-since=2026-07-01 "https://github.com/$($repos[$r])" "$b\repos\$r" }
  else { git -C "$b\repos\$r" fetch -q --shallow-since=2026-07-01 origin }
}
# id, repo, parent sha, kind, python path for .pth
$bugs = @(
  @("z6495","zod","1a16102a494b03ce1df7b80b663ae2df465f419e","pnpm",""),
  @("z6496","zod","7e24a24288183ce02554f1ded7775d0650a7b7e6","pnpm",""),
  @("mit","more-itertools","30ada7dd597316a3ef967911477e0a1d9f55eefe","py","../../.."),
  @("ct435","cachetools","0985ec0d8fefdce90bcbba2dfe88117dad9bb6f6","py","../../../src"),
  @("pm1643","markdown","3ade80d7c2cad90c8961c80d9640d80a09afd33f","py","../../.."),
  @("pp653","pyparsing","038ff39cbc29b77a74ac21674206d5bf170ca769","py","../../.."),
  @("mdit1201","markdown-it","7b9a6a3a630187e6f9b18fe66b66804bc9ac1122","npm",""),
  @("jy791","js-yaml","04d6fe3298191ee94adf8b1bad87bd2d909092af","npmyaml",""),
  @("mk4059","marked","0653c24b59edfe03e327cbb68ea8318cd0b93641","npmmarked",""),
  @("mk4051","marked","8698d35b84c17f86ea8a299a6183d47ccb3d2bd7","npmmarked","")
)
foreach ($x in $bugs) {
  $id, $r, $sha, $kind, $pth = $x
  $d = "$b\base\$id"
  if (Test-Path "$b\base\$id.ready") { "$id ready"; continue }
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
  New-Item -ItemType Directory -Force $d | Out-Null
  git -c core.autocrlf=false -C "$b\repos\$r" archive --format=tar -o "$b\$id.tar" $sha
  tar -xf "$b\$id.tar" -C $d
  Remove-Item "$b\$id.tar"
  Push-Location $d
  $log = "$b\base\$id.setup.log"
  switch ($kind) {
    "pnpm" { cmd /c "npx -y pnpm@10.12.1 install --frozen-lockfile --ignore-scripts > `"$log`" 2>&1" }
    "py" {
      & $py -m venv .venv
      & ".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check pytest hypothesis *> $log
      [System.IO.File]::WriteAllText("$d\.venv\Lib\site-packages\project_src.pth", "$pth`n")
    }
    "npm" { cmd /c "npm ci --no-audit --no-fund --ignore-scripts > `"$log`" 2>&1" }
    "npmyaml" { cmd /c "npm ci --no-audit --no-fund --ignore-scripts > `"$log`" 2>&1 && node support/build-dist.mjs >> `"$log`" 2>&1" }
    "npmmarked" { cmd /c "npm ci --no-audit --no-fund --ignore-scripts > `"$log`" 2>&1 && node esbuild.config.js >> `"$log`" 2>&1" }
  }
  "exit $LASTEXITCODE" | Out-File -Append -Encoding utf8 $log
  foreach ($ig in @("node_modules/", ".venv/")) {
    if (-not (Select-String -Quiet -SimpleMatch -Path .gitignore -Pattern $ig -ErrorAction SilentlyContinue)) { $ig | Out-File -Append -Encoding ascii .gitignore }
  }
  git init -q; git config core.autocrlf false; git add -A 2>$null; git -c user.name=study -c user.email=study@example.com commit -q -m "source"
  "$id done: $((Get-Content $log -Tail 1)) | untracked/modified after commit: $((git status --short | Measure-Object).Count)"
  Pop-Location
  "ok" | Out-File "$b\base\$id.ready"
}
"HARD SETUP DONE"
