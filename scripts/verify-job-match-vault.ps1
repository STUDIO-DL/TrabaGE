param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD
)

$ErrorActionPreference = "Stop"
$supabaseExe = if (Get-Command supabase -ErrorAction SilentlyContinue) { "supabase" } else { "C:\Tools\supabase\supabase.exe" }

if ($supabaseExe -ne "supabase" -and -not (Test-Path $supabaseExe)) {
  throw "Missing Supabase CLI. Install with: npm i -g supabase"
}

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
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"

function Invoke-DbQuery([string]$Sql) {
  & $supabaseExe db query --db-url $dbUrl $Sql
  if ($LASTEXITCODE -ne 0) { throw "SQL query failed" }
}

Write-Host "1) Checking vault secrets for job match..."
Invoke-DbQuery @"
SELECT
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'job_match_url') AS has_match_url,
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'job_match_auth') AS has_match_auth,
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'job_match_digest_url') AS has_digest_url,
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'job_match_digest_auth') AS has_digest_auth;
"@

Write-Host ""
Write-Host "2) Checking pg_cron jobs..."
Invoke-DbQuery @"
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'trabage_job_match_outbox_retry',
  'trabage_job_match_digest_daily',
  'trabage_job_match_digest_weekly'
)
ORDER BY jobname;
"@

Write-Host ""
Write-Host "Done. If any has_* is false, run scripts\setup-job-match-vault.ps1"
