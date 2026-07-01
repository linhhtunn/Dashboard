param(
    [string]$EnvPath = "$PSScriptRoot\..\.env",
    [string]$TimescaleDbUrl = "",
    [string]$SupabaseDbUrl = ""
)

function Read-EnvFile {
    param([string]$Path)
    $values = [ordered]@{}
    $lines = @()
    if (Test-Path $Path) {
        $lines = Get-Content -LiteralPath $Path
        foreach ($line in $lines) {
            if ($line -match '^\s*#' -or $line -notmatch '=') {
                continue
            }
            $parts = $line -split '=', 2
            $values[$parts[0].Trim()] = $parts[1]
        }
    }
    return @{ Values = $values; Lines = $lines }
}

function Write-EnvValue {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Key,
        [string]$Value
    )
    $escapedKey = [regex]::Escape($Key)
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match "^\s*$escapedKey=") {
            $Lines[$i] = "$Key=$Value"
            return
        }
    }
    $Lines.Add("$Key=$Value")
}

function Get-QueryValue {
    param([string]$Query, [string]$Name)
    if ([string]::IsNullOrWhiteSpace($Query)) {
        return ""
    }
    $trimmed = $Query.TrimStart("?")
    foreach ($part in $trimmed -split "&") {
        $kv = $part -split "=", 2
        if ($kv.Length -eq 2 -and $kv[0] -eq $Name) {
            return [uri]::UnescapeDataString($kv[1])
        }
    }
    return ""
}

function Update-DbVars {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [hashtable]$ExistingValues,
        [string]$Prefix,
        [string]$DbUrl,
        [string]$PasswordFallback = ""
    )
    if ([string]::IsNullOrWhiteSpace($DbUrl)) {
        return
    }
    $uri = [System.Uri]$DbUrl
    $userinfo = $uri.UserInfo -split ":", 2
    $user = if ($userinfo.Length -ge 1) { [uri]::UnescapeDataString($userinfo[0]) } else { "" }
    $password = if ($userinfo.Length -eq 2) { [uri]::UnescapeDataString($userinfo[1]) } else { $PasswordFallback }
    if ($ExistingValues.Contains("${Prefix}_USER") -and ![string]::IsNullOrWhiteSpace($ExistingValues["${Prefix}_USER"])) {
        $user = $ExistingValues["${Prefix}_USER"]
    }
    if ($ExistingValues.Contains("${Prefix}_PASSWORD") -and ![string]::IsNullOrWhiteSpace($ExistingValues["${Prefix}_PASSWORD"])) {
        $password = $ExistingValues["${Prefix}_PASSWORD"]
    }
    $db = $uri.AbsolutePath.TrimStart("/")
    $sslmode = Get-QueryValue -Query $uri.Query -Name "sslmode"
    if ([string]::IsNullOrWhiteSpace($sslmode)) {
        $sslmode = "require"
    }

    Write-EnvValue -Lines $Lines -Key "${Prefix}_HOST" -Value $uri.Host
    Write-EnvValue -Lines $Lines -Key "${Prefix}_PORT" -Value $uri.Port
    Write-EnvValue -Lines $Lines -Key "${Prefix}_DB" -Value $db
    Write-EnvValue -Lines $Lines -Key "${Prefix}_USER" -Value $user
    Write-EnvValue -Lines $Lines -Key "${Prefix}_PASSWORD" -Value $password
    Write-EnvValue -Lines $Lines -Key "${Prefix}_SSLMODE" -Value $sslmode
}

$resolvedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($EnvPath)
$parsed = Read-EnvFile -Path $resolvedPath
$values = $parsed.Values
$lines = [System.Collections.Generic.List[string]]::new()
foreach ($line in $parsed.Lines) {
    $lines.Add($line)
}

if ($lines.Count -eq 0) {
    throw "Env file not found or empty: $resolvedPath"
}

if ([string]::IsNullOrWhiteSpace($TimescaleDbUrl) -and $values.Contains("TIMESCALE_DB_URL")) {
    $TimescaleDbUrl = $values["TIMESCALE_DB_URL"]
}
if ([string]::IsNullOrWhiteSpace($SupabaseDbUrl) -and $values.Contains("SUPABASE_DB_URL")) {
    $SupabaseDbUrl = $values["SUPABASE_DB_URL"]
}
$timescalePasswordFallback = if ($values.Contains("TIMESCALE_DB_PASSWORD")) { $values["TIMESCALE_DB_PASSWORD"] } else { "" }

Update-DbVars -Lines $lines -ExistingValues $values -Prefix "TIMESCALE" -DbUrl $TimescaleDbUrl -PasswordFallback $timescalePasswordFallback
Update-DbVars -Lines $lines -ExistingValues $values -Prefix "SUPABASE" -DbUrl $SupabaseDbUrl

Set-Content -LiteralPath $resolvedPath -Value $lines -Encoding UTF8
Write-Output "Updated split Grafana DB variables in $resolvedPath"
