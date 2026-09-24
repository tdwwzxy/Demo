param([string]$BaseUrl = 'http://127.0.0.1:8080')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$report = Invoke-RestMethod "$BaseUrl/api/report"
$csvText = (Invoke-WebRequest "$BaseUrl/api/data.csv" -UseBasicParsing).Content
$rows = @($csvText | ConvertFrom-Csv)
if ($rows.Count -ne $report.totalRows) { throw 'CSV row count differs from report.' }
$latest = $rows[-1]
if ($latest.date -ne $report.latestDate) { throw 'CSV latest date differs from report.' }
$average = ($rows | Select-Object -Last 756 | ForEach-Object { [double]::Parse($_.close, [Globalization.CultureInfo]::InvariantCulture) } | Measure-Object -Average).Average
$close = [double]::Parse($latest.close, [Globalization.CultureInfo]::InvariantCulture)
if ([Math]::Abs($average - $report.latest.ma3y) -gt 1e-9) { throw 'SMA verification failed.' }
if ([Math]::Abs($close / $average - $report.latest.normalized) -gt 1e-12) { throw 'Normalized price verification failed.' }
$bytes = [IO.File]::ReadAllBytes($report.outputPath)
if ($bytes[0] -ne 137 -or $bytes[1] -ne 80 -or $bytes[2] -ne 78 -or $bytes[3] -ne 71) { throw 'PNG signature missing.' }
$width = $bytes[16]*16777216 + $bytes[17]*65536 + $bytes[18]*256 + $bytes[19]
$height = $bytes[20]*16777216 + $bytes[21]*65536 + $bytes[22]*256 + $bytes[23]
if ($width -ne 4883 -or $height -ne 2900) { throw "Unexpected dimensions: $width x $height" }
$hash = (Get-FileHash -LiteralPath $report.outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hash -ne $report.pngSha256) { throw 'PNG file differs from manifest.' }
$responseFile = Join-Path $PSScriptRoot 'target/verified-response.png'
Invoke-WebRequest "$BaseUrl/api/report.png" -UseBasicParsing -OutFile $responseFile
if ((Get-FileHash -LiteralPath $responseFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash) { throw 'HTTP PNG differs from output file.' }
if ($report.latestProviderCheck) {
    $providerLatest = $report.latestProviderCheck.response.data.kline_list | Sort-Object date | Select-Object -Last 1
    $providerDate = [datetime]::ParseExact([string]$providerLatest.date,'yyyyMMdd',[Globalization.CultureInfo]::InvariantCulture).ToString('yyyy-MM-dd')
    if ($providerDate -eq $report.latestDate -and [Math]::Abs($providerLatest.close_price - $report.latest.close) -gt 1e-12) { throw 'Latest provider close differs from report.' }
    Write-Output "Latest saved provider check: $providerDate (retrieved $($report.latestProviderCheck.retrievedAt))"
}
Write-Output "PASS: $($rows.Count) rows; latest date $($report.latestDate); close $close; SMA $average; ratio $($report.latest.normalized)"
Write-Output "PASS: HTTP PNG = output file = manifest SHA-256; $width x $height"
Write-Output $report.outputPath
