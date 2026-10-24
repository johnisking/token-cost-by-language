$ErrorActionPreference = "Continue"
# Re-extract each base with LF line endings (core.autocrlf=true had converted them to CRLF), keep node_modules.
$b = "$env:USERPROFILE\Downloads\agent-test\b15"
$bugs = @(@("y802","js-yaml","30108cc8"), @("y798","js-yaml","e5a3ba0e"), @("d699","jsdiff","c207c497"), @("d707","jsdiff","b9d516f3"),
  @("d701","jsdiff","84726cae"), @("q629","qs","81e7a225"), @("q624","qs","5c1d08cd"), @("p1163","PapaParse","4843fc20"), @("m1204","markdown-it","5e9b1cc8"))
foreach ($x in $bugs) {
  $id, $r, $sha = $x
  $d = "$b\base\$id"
  git -c core.autocrlf=false -C "$b\repos\$r" archive --format=tar -o "$b\$id.tar" $sha
  tar -xf "$b\$id.tar" -C $d
  Remove-Item "$b\$id.tar"
  Remove-Item -Recurse -Force "$d\.git"
  Push-Location $d
  git init -q; git config core.autocrlf false; git add -A 2>$null; git -c user.name=study -c user.email=study@example.com commit -q -m "source"
  $crlf = (Get-Content -Raw "package.json") -match "`r`n"
  "$id crlf_in_package_json=$crlf status=" + ((git status --short | Measure-Object).Count)
  Pop-Location
}
