param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD
)

$ErrorActionPreference = "Stop"
$supabaseExe = "C:\Tools\supabase\supabase.exe"

if (-not (Test-Path $supabaseExe)) { throw "Missing $supabaseExe" }

if (-not $DbPassword) {
  $secure = Read-Host "Pega la Database Password de Supabase (no se mostrara)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $DbPassword) { throw "No database password provided." }

$encodedPassword = [Uri]::EscapeDataString($DbPassword)
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

function Invoke-DbQuery([string]$Sql) {
  & $supabaseExe db query --db-url $dbUrl $Sql
  if ($LASTEXITCODE -ne 0) { throw "SQL query failed" }
}

Write-Host "1) Checking vault secrets for push cron..."
Invoke-DbQuery @"
SELECT
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cron_url') AS has_url,
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cron_auth') AS has_auth;
"@

Write-Host ""
Write-Host "2) Checking pg_cron job trabage_push_maintenance..."
Invoke-DbQuery @"
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'trabage_push_maintenance';
"@

Write-Host ""
Write-Host "3) Recent push_send_log activity (last 24h)..."
Invoke-DbQuery @"
SELECT status, COUNT(*) AS total
FROM public.push_send_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;
"@

Write-Host ""
Write-Host "Done. If has_url/has_auth are false or no cron row exists, run setup-push-cron.ps1"
