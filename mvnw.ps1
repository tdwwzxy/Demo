param([Parameter(ValueFromRemainingArguments=$true)][string[]]$MavenArgs)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
if ($mavenCommand) { $mavenExecutable = $mavenCommand.Source }
elseif ($env:MAVEN_HOME -and (Test-Path (Join-Path $env:MAVEN_HOME 'bin/mvn.cmd'))) { $mavenExecutable = Join-Path $env:MAVEN_HOME 'bin/mvn.cmd' }
else {
    $mavenExecutable = 'D:/Program Files/JetBrains/IntelliJ IDEA 2025.3.3/plugins/maven/lib/maven3/bin/mvn.cmd'
    if (-not (Test-Path $mavenExecutable)) { throw 'Install Maven 3.6.3+ and add it to PATH, or set MAVEN_HOME.' }
}
& $mavenExecutable @MavenArgs
exit $LASTEXITCODE
