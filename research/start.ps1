param([int]$Port = 8080, [switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not $SkipBuild) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'mvnw.ps1') -B -ntp package
    if ($LASTEXITCODE -ne 0) { throw 'Build or tests failed.' }
}
$jarPath = Join-Path $PSScriptRoot 'target/ten-year-futures-1.0.0.jar'
if (-not (Test-Path $jarPath)) { throw 'Run the Maven build first.' }
$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) { throw "Port $Port is already occupied. Use -Port to choose another port." }
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'logs') | Out-Null
$javaExecutable = (Get-Command java.exe).Source
$arguments = @('-Dfile.encoding=UTF-8','-Djava.awt.headless=true','-jar',('"' + $jarPath + '"'),"--server.port=$Port")
$process = Start-Process -FilePath $javaExecutable -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'logs/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'logs/server-error.log')
$process.Id | Set-Content (Join-Path $PSScriptRoot 'server.pid')
$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ($process.HasExited) { throw 'Server exited. Inspect logs/server.log and logs/server-error.log.' }
    try {
        $report = Invoke-RestMethod "http://127.0.0.1:$Port/api/report" -TimeoutSec 2
        $ready = $true
        break
    } catch { Start-Sleep -Milliseconds 700 }
}
if (-not $ready) { throw 'Server did not become ready. Inspect logs/server.log.' }
Write-Output "Running: http://127.0.0.1:$Port/"
Write-Output "Latest market date: $($report.latestDate)"
Write-Output "PNG: $($report.outputPath)"
