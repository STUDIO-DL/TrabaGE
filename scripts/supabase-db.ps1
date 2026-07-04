param(
  [ValidateSet("transaction", "session")]
  [string]$PoolerMode = "transaction",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$SupabaseArgs
)

$ErrorActionPreference = "Stop"

$ProjectRef = "jqzbpdojwzopwuaapqgl"
$PoolerHost = "aws-0-eu-west-2.pooler.supabase.com"
$PoolerPort = if ($PoolerMode -eq "session") { 5432 } else { 6543 }
$SupabaseExe = "C:\Tools\supabase\supabase.exe"

if (-not (Test-Path $SupabaseExe)) {
  throw "No se encontro $SupabaseExe"
}

if (-not $SupabaseArgs -or $SupabaseArgs.Count -eq 0) {
  Write-Host "Uso:"
  Write-Host "  scripts\supabase-db.cmd migration list"
  Write-Host "  scripts\supabase-db.cmd db push --dry-run"
  Write-Host "  scripts\supabase-db.cmd db pull nombre_migracion"
  Write-Host "  scripts\supabase-db.cmd db diff --schema public"
  Write-Host "  scripts\supabase-db.cmd gen types typescript --schema public"
  Write-Host "  scripts\supabase-db.cmd -PoolerMode session migration list"
  exit 1
}

if ($env:SUPABASE_DB_PASSWORD) {
  $password = $env:SUPABASE_DB_PASSWORD
}
else {
  $secure = Read-Host "Pega la Database Password de Supabase (no se mostrara)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $password) {
  throw "No se recibio password de base de datos."
}

$encodedPassword = [Uri]::EscapeDataString($password)
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@${PoolerHost}:$PoolerPort/postgres?sslmode=require"
$argsWithDbUrl = @($SupabaseArgs) + @("--db-url", $dbUrl)

$env:SUPABASE_INTERNAL_NO_TELEMETRY = "1"
$env:DO_NOT_TRACK = "1"

Write-Host "Conectando via Supabase pooler ($PoolerMode): ${PoolerHost}:${PoolerPort}"
& $SupabaseExe @argsWithDbUrl
exit $LASTEXITCODE
