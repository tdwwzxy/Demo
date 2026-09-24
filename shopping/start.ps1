param(
    [ValidateRange(1024,65535)][int]$Port = 8091,
    [ValidateSet('127.0.0.1','0.0.0.0')][string]$ListenAddress = '127.0.0.1',
    [switch]$Build
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$jar = Join-Path $PSScriptRoot 'backend\target\shopping-1.0.0.jar'
if ($Build -or -not (Test-Path -LiteralPath $jar)) {
    & (Join-Path $PSScriptRoot 'build.ps1')
}
$java = (Get-Command java.exe -ErrorAction Stop).Source
$existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) { throw "Port $Port is already in use. Stop the existing service or choose another -Port." }
$logs = Join-Path $PSScriptRoot 'logs'
$data = Join-Path $PSScriptRoot 'data'
New-Item -ItemType Directory -Force -Path $logs,$data | Out-Null
# Keep runtime arguments separate from source and preserve the caller's environment.
$argumentList = @('-Djdk.net.unixdomain.tmpdir=.', '-jar', ('"' + $jar + '"'), "--server.port=$Port", "--server.address=$ListenAddress", ('"--shop.data-dir=' + $data.Replace('\','/') + '"'))
$process = Start-Process -FilePath $java -ArgumentList $argumentList -WorkingDirectory (Join-Path $PSScriptRoot 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "server-$Port.log") -RedirectStandardError (Join-Path $logs "server-$Port.err.log")
$process.Id | Set-Content -LiteralPath (Join-Path $logs "server-$Port.pid") -Encoding ascii
$ready = $false
for ($i=0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw "Server exited. See logs\server-$Port.log and .err.log." }
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/products" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}
if (-not $ready) { throw "Server is still starting. See logs\server-$Port.log." }
Write-Host "Store: http://127.0.0.1:$Port/"
Write-Host "Admin: http://127.0.0.1:$Port/#/admin"
Write-Host 'Username: admin'
if (-not $env:SHOP_ADMIN_PASSWORD) { Write-Host "Generated password file: $data\admin-password.txt" }
if ($ListenAddress -eq '0.0.0.0') { Write-Host "LAN mode: use this computer's LAN IP and port $Port on your phone." }
