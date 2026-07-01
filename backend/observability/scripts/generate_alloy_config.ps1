param(
    [string]$EnvPath = "$PSScriptRoot\..\.env",
    [string]$TemplatePath = "$PSScriptRoot\..\alloy\config.alloy.template",
    [string]$OutputPath = "$PSScriptRoot\..\alloy\config.local.alloy"
)

function Read-EnvValues {
    param([string]$Path)
    $values = @{}
    if (!(Test-Path -LiteralPath $Path)) {
        throw "Env file not found: $Path"
    }
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or $line -notmatch '=') {
            continue
        }
        $parts = $line -split '=', 2
        $values[$parts[0].Trim()] = $parts[1]
    }
    return $values
}

$envValues = Read-EnvValues -Path $EnvPath
$required = @(
    "GCLOUD_RW_API_KEY",
    "GCLOUD_HOSTED_METRICS_ID",
    "GCLOUD_HOSTED_METRICS_URL"
)

foreach ($key in $required) {
    if (!$envValues.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envValues[$key])) {
        throw "Missing $key in $EnvPath"
    }
}

$content = Get-Content -LiteralPath $TemplatePath -Raw
Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8

Write-Output "Generated $OutputPath"
Write-Output "Before starting Alloy, set these environment variables:"
Write-Output "  GCLOUD_RW_API_KEY"
Write-Output "  GCLOUD_HOSTED_METRICS_ID"
Write-Output "  GCLOUD_HOSTED_METRICS_URL"
