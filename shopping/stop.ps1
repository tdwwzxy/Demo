param([ValidateRange(1024,65535)][int]$Port = 8091)
$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot "logs\server-$Port.pid"
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No saved server PID.'; return }
$serverProcessId = [int](Get-Content -LiteralPath $pidFile -Raw).Trim()
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$serverProcessId"
$expectedJar = Join-Path $PSScriptRoot 'backend\target\shopping-1.0.0.jar'
if ($process) {
    # PID may be recycled: verify the process belongs to this exact project before stopping it.
    if ($process.Name -notin @('java.exe','javaw.exe') -or -not $process.CommandLine.Contains($expectedJar) -or -not $process.CommandLine.Contains("--server.port=$Port")) {
        throw 'PID belongs to another process; no process was stopped.'
    }
    Stop-Process -Id $serverProcessId
    Wait-Process -Id $serverProcessId -Timeout 10 -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $pidFile
Write-Host "Shopping server on port $Port stopped."
