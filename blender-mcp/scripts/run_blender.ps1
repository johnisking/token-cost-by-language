$ErrorActionPreference = "Continue"
$root = "$env:USERPROFILE\Downloads\mcp-diet\blender"
$blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$uvx = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe\uvx.EXE"
$uvxJ = $uvx -replace '\\','\\'
$diet = ("$env:USERPROFILE\Downloads\mcp-diet\diet-blender\index.js") -replace '\\','/'
"{""mcpServers"":{""blender"":{""command"":""$uvxJ"",""args"":[""mcp-for-blender""]}}}" | Out-File -Encoding ascii "$root\mcp_base.json"
"{""mcpServers"":{""blender"":{""command"":""node"",""args"":[""$diet"",""--"",""$uvxJ"",""mcp-for-blender""]}}}" | Out-File -Encoding ascii "$root\mcp_diet.json"
$only = "Use only the Blender tools."
$tasks = @{
  "infoS" = @("S", "$only Tell me what is in the current Blender scene and where the camera is. Answer in a few short lines.");
  "infoL" = @("L", "$only Tell me what is in the current Blender scene and where the camera is. Answer in a few short lines.");
  "build" = @("E", "$only Starting from the current scene, build a simple low-poly wooden table with four chairs around it. Name the table object 'Table' and the chairs 'Chair 1' to 'Chair 4'. When you are done, reply with just the word done.");
  "red"   = @("S", "$only Make all four chairs in the scene red, then look at the scene to check that they look right. Reply with one short line.");
  "sides" = @("S", "$only Look at the table from the front, back, left and right, and for each side tell me in one short line whether all four chairs are visible.");
  "verts" = @("L", "$only Print the world-space location of every vertex of the object named BigMesh, then reply with just the word done.");
  "props" = @("L", "$only Print every property of every object in the scene (name, type, location, rotation, scale, dimensions, parent, materials, modifiers and custom properties), one object per line, then reply with just the word done.");
  "race"  = @("E", "$only In the current scene, build a low-poly racing car of your own design (it must not copy any real car brand or model) and a simple race circuit with at least one corner. Animate the car driving through the corner over 5 seconds at 24 fps (frames 1 to 120). Add a camera that follows behind the car (a chase camera) and make it the scene camera. Set the render engine to EEVEE and the resolution to 1280x720. Look at the result to check it, but do not render the animation. When you are done, reply with just the word done.")
}
$dis = "WebFetch WebSearch Bash Read Write Edit Glob Grep Agent mcp__blender__generate_3d mcp__blender__search_assets mcp__blender__import_asset"

function Send-Blender($obj) {
  $c = New-Object Net.Sockets.TcpClient('127.0.0.1', 9876); $s = $c.GetStream()
  $b = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress)); $s.Write($b, 0, $b.Length)
  $s.ReadTimeout = 60000; $buf = New-Object byte[] 65536; $n = $s.Read($buf, 0, $buf.Length); $c.Close()
  return [Text.Encoding]::UTF8.GetString($buf, 0, $n)
}

foreach ($name in $args) {
  # name = <mode>_<task>_r<n>, e.g. base_red_r1
  $mode, $tk, $rep = $name.Split("_")
  $scene, $prompt = $tasks[$tk]
  $d = "$root\runs\$name"; New-Item -ItemType Directory -Force $d | Out-Null
  Get-Process blender -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep 2
  Copy-Item "$root\scenes\scene_$scene.blend" "$d\work.blend" -Force
  $bp = Start-Process $blender -ArgumentList "--window-geometry 0 0 1280 800 `"$d\work.blend`"" -PassThru
  $ok = $false; for ($i = 0; $i -lt 60; $i++) { Start-Sleep 1; if (Get-NetTCPConnection -LocalPort 9876 -State Listen -ErrorAction SilentlyContinue) { $ok = $true; break } }
  if (-not $ok) { "$name NO_BLENDER" ; continue }
  Start-Sleep 3
  Push-Location $d
  $t0 = Get-Date
  cmd /c "claude -p `"$prompt`" --effort medium --output-format stream-json --verbose --mcp-config `"$root\mcp_$mode.json`" --strict-mcp-config --allowedTools `"mcp__blender`" --disallowedTools `"$dis`" < NUL > run.jsonl 2>&1"
  $s = [int]((Get-Date) - $t0).TotalSeconds
  $s | Out-File -Encoding ascii seconds.txt
  $after = ("$d\after.blend") -replace '\\','/'
  try { Send-Blender @{ type = "execute_code"; params = @{ code = "import bpy; bpy.ops.wm.save_as_mainfile(filepath='$after', copy=True)" } } | Out-File -Encoding utf8 save.txt } catch { "save failed: $_" | Out-File save.txt }
  Pop-Location
  Stop-Process -Id $bp.Id -Force -ErrorAction SilentlyContinue
  Write-Output "$name seconds=$s"
}
Write-Output "ALL DONE"
