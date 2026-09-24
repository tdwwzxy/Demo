$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot 'server.pid'
if (-not (Test-Path $pidFile)) { Write-Output 'No managed server PID file.'; exit }
$serverProcessId = [int](Get-Content $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$serverProcessId" -ErrorAction SilentlyContinue
$expectedJar = Join-Path $PSScriptRoot 'target/ten-year-futures-1.0.0.jar'
if ($process -and $process.Name -match '^java(w)?\.exe$' -and $process.CommandLine.Contains($expectedJar)) {
    Stop-Process -Id $serverProcessId
    Write-Output 'Report server stopped.'
} elseif ($process) { throw 'PID belongs to another process; refusing to stop it.' }
Remove-Item -LiteralPath $pidFile
