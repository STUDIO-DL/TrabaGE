param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
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

if (-not $ServiceRoleKey) {
  $secure = Read-Host "Pega el Service Role Key de Supabase (no se mostrara)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $ServiceRoleKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $DbPassword -or -not $ServiceRoleKey) {
  throw "Database password and service role key are required."
}

$pushUrl = "https://$ProjectRef.supabase.co/functions/v1/send_push"
$pushAuth = "Bearer $ServiceRoleKey"

function Escape-Sql([string]$value) {
  return $value.Replace("'", "''")
}

$vaultSql = @"
DO `$`$
DECLARE
  v_url TEXT := '$(Escape-Sql $pushUrl)';
  v_auth TEXT := '$(Escape-Sql $pushAuth)';
  v_url_id UUID;
  v_auth_id UUID;
BEGIN
  SELECT id INTO v_url_id FROM vault.secrets WHERE name = 'push_cron_url' LIMIT 1;
  IF v_url_id IS NULL THEN
    PERFORM vault.create_secret(v_url, 'push_cron_url');
  ELSE
    PERFORM vault.update_secret(v_url_id, v_url);
  END IF;

  SELECT id INTO v_auth_id FROM vault.secrets WHERE name = 'push_cron_auth' LIMIT 1;
  IF v_auth_id IS NULL THEN
    PERFORM vault.create_secret(v_auth, 'push_cron_auth');
  ELSE
    PERFORM vault.update_secret(v_auth_id, v_auth);
  END IF;
END;
`$`$;
"@

$cronSql = @'
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net unavailable: %', SQLERRM;
    RETURN;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
    RETURN;
  END;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'trabage_push_maintenance';

  PERFORM cron.schedule(
    'trabage_push_maintenance',
    '* * * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_url' LIMIT 1),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_auth' LIMIT 1)
      ),
      body := jsonb_build_object(
        'process_scheduled', true,
        'process_message_pushes', true
      )
    );
    $cron$
  );

  RAISE NOTICE 'Scheduled trabage_push_maintenance cron (* * * * *)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule push cron: %', SQLERRM;
END;
$$;
'@

$encodedPassword = [Uri]::EscapeDataString($DbPassword)
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

Write-Host "1) Upserting vault secrets push_cron_url / push_cron_auth..."
& $supabaseExe db query --db-url $dbUrl $vaultSql
if ($LASTEXITCODE -ne 0) { throw "Vault upsert failed" }

Write-Host "2) Scheduling pg_cron job trabage_push_maintenance..."
& $supabaseExe db query --db-url $dbUrl $cronSql
if ($LASTEXITCODE -ne 0) { throw "Cron schedule failed" }

Write-Host "3) Verifying cron job..."
& $supabaseExe db query --db-url $dbUrl "SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'trabage_push_maintenance';"
if ($LASTEXITCODE -ne 0) { throw "Cron verification failed" }

Write-Host "Push cron setup complete."
