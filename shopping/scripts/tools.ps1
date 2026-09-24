# Explicit paths win; otherwise use PATH or the IntelliJ Maven already installed on this PC.
function Find-ShoppingMaven([string]$ExplicitPath) {
    if ($ExplicitPath) {
        if (-not (Test-Path -LiteralPath $ExplicitPath -PathType Leaf)) { throw 'MavenPath does not exist.' }
        return (Resolve-Path -LiteralPath $ExplicitPath).Path
    }
    $found = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }
    foreach ($base in @('D:\Program Files\JetBrains', 'C:\Program Files\JetBrains')) {
        if (Test-Path -LiteralPath $base) {
            $candidate = Get-ChildItem -Path (Join-Path $base 'IntelliJ IDEA *\plugins\maven\lib\maven3\bin\mvn.cmd') -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending | Select-Object -First 1
            if ($candidate) { return $candidate.FullName }
        }
    }
    throw 'Maven 3.6.3+ is required. Put mvn.cmd on PATH or use -MavenPath.'
}

