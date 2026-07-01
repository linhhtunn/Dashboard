param(
    [string]$EnvPath = "$PSScriptRoot\..\.env",
    [string]$TemplatePath = "$PSScriptRoot\..\prometheus\prometheus.cloud.yml.template",
    [string]$OutputPath = "$PSScriptRoot\..\prometheus\prometheus.cloud.yml"
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
    "GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL",
    "GRAFANA_CLOUD_PROMETHEUS_USERNAME",
    "GRAFANA_CLOUD_PROMETHEUS_PASSWORD"
)

foreach ($key in $required) {
    if (!$envValues.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envValues[$key])) {
        throw "Missing $key in $EnvPath"
    }
}

$content = Get-Content -LiteralPath $TemplatePath -Raw
$content = $content.Replace("__GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL__", $envValues["GRAFANA_CLOUD_PROMETHEUS_REMOTE_WRITE_URL"])
$content = $content.Replace("__GRAFANA_CLOUD_PROMETHEUS_USERNAME__", $envValues["GRAFANA_CLOUD_PROMETHEUS_USERNAME"])
$content = $content.Replace("__GRAFANA_CLOUD_PROMETHEUS_PASSWORD__", $envValues["GRAFANA_CLOUD_PROMETHEUS_PASSWORD"])

Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8
Write-Output "Generated $OutputPath"
Write-Output "Set PROMETHEUS_CONFIG_FILE=./prometheus/prometheus.cloud.yml in backend/observability/.env before docker compose up."
