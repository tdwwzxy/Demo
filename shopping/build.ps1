param([string]$MavenPath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'scripts\tools.ps1')
$maven = Find-ShoppingMaven $MavenPath
$pnpm = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue)
if (-not $pnpm) { throw 'pnpm is required. Install Node.js 22.12+ and pnpm first.' }
Push-Location (Join-Path $PSScriptRoot 'frontend')
try {
    & $pnpm.Source install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    & $pnpm.Source check
    if ($LASTEXITCODE -ne 0) { throw 'Frontend checks failed.' }
} finally { Pop-Location }
Push-Location (Join-Path $PSScriptRoot 'backend')
try {
    & $maven -B -ntp clean package
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests or packaging failed.' }
} finally { Pop-Location }
Write-Host 'Built: backend\target\shopping-1.0.0.jar (includes React assets)'

