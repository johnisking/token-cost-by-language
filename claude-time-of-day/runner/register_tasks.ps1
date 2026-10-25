# Registers 4 daily scheduled tasks for the time-of-day study, 2026-10-27 to 2026-11-02 (KST).
$tod = "$env:USERPROFILE\Downloads\agent-test\tod"
$times = @(@("0400","04:00"), @("0900","09:00"), @("1500","15:00"), @("2330","23:30"))
foreach ($x in $times) {
  $name = "TokenSave TOD $($x[0])"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$tod\tod_run.ps1`"" -WorkingDirectory $tod
  $start = [datetime]::ParseExact("2026-10-27 $($x[1])", "yyyy-MM-dd HH:mm", $null)
  $trigger = New-ScheduledTaskTrigger -Daily -At $start
  $trigger.EndBoundary = "2026-11-02T23:59:00"
  $settings = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable:$false -ExecutionTimeLimit (New-TimeSpan -Hours 3) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description "Time-of-day quality study (Claude Haiku 5.5), 2026-10-27 to 2026-11-02" -Force | Out-Null
}
Get-ScheduledTask -TaskName "TokenSave TOD*" | ForEach-Object { "$($_.TaskName)  next: $((Get-ScheduledTaskInfo $_).NextRunTime)" }

