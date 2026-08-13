param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD
)

$ErrorActionPreference = "Stop"
$supabaseExe = "C:\Tools\supabase\supabase.exe"
$migrationPath = Join-Path $PSScriptRoot "..\supabase\migrations\140_push_test_web_subscriptions.sql"

if (-not (Test-Path $supabaseExe)) { throw "Missing $supabaseExe" }
if (-not (Test-Path $migrationPath)) { throw "Missing $migrationPath" }

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
$sql = Get-Content $migrationPath -Raw

Write-Host "Applying migration 140_push_test_web_subscriptions.sql..."
& $supabaseExe db query --db-url $dbUrl $sql
if ($LASTEXITCODE -ne 0) { throw "Migration 140 failed" }

Write-Host "Verifying send_test_push_notification exists..."
& $supabaseExe db query --db-url $dbUrl "SELECT proname FROM pg_proc WHERE proname = 'send_test_push_notification';"
if ($LASTEXITCODE -ne 0) { throw "Verification failed" }

Write-Host "Migration 140 applied."
