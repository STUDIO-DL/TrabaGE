param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
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

if (-not $ServiceRoleKey) {
  Write-Host "Fetching service_role key via Supabase CLI..."
  $keysFile = Join-Path $env:TEMP "supabase-api-keys-$ProjectRef.json"
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $supabaseExe projects api-keys --project-ref $ProjectRef --output json 1> $keysFile 2>$null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $keysFile)) {
      throw "Failed to fetch API keys (run scripts\supabase-login.cmd if needed)"
    }
    $keysJson = (Get-Content $keysFile -Raw).Trim()
  }
  finally {
    Remove-Item $keysFile -ErrorAction SilentlyContinue
    $ErrorActionPreference = $prevEap
  }
  $parsed = $keysJson | ConvertFrom-Json
  $keyRows = if ($parsed.keys) { @($parsed.keys) } else { @($parsed) }
  $serviceRow = $keyRows | Where-Object {
    $_.'id' -eq "service_role" -or $_.'name' -eq "service_role" -or $_.description -like "*service_role*"
  } | Select-Object -First 1
  $ServiceRoleKey = $serviceRow.api_key
}

if (-not $ServiceRoleKey -and [Environment]::UserInteractive) {
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
  throw @"
Database password and service role key are required.
Set env vars before running:
  `$env:SUPABASE_DB_PASSWORD = '<database-password>'
  `$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
Or run this script in an interactive PowerShell session.
"@
}

$matchUrl = "https://$ProjectRef.supabase.co/functions/v1/match_job_recommendations"
$digestUrl = "https://$ProjectRef.supabase.co/functions/v1/send_job_match_digest"

function Escape-Sql([string]$value) {
  return $value.Replace("'", "''")
}

$vaultSql = @"
DO `$`$
DECLARE
  v_match_url TEXT := '$(Escape-Sql $matchUrl)';
  v_match_auth TEXT := '$(Escape-Sql $ServiceRoleKey)';
  v_digest_url TEXT := '$(Escape-Sql $digestUrl)';
  v_digest_auth TEXT := '$(Escape-Sql $ServiceRoleKey)';
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'job_match_url' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_match_url, 'job_match_url');
  ELSE
    PERFORM vault.update_secret(v_id, v_match_url);
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = 'job_match_auth' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_match_auth, 'job_match_auth');
  ELSE
    PERFORM vault.update_secret(v_id, v_match_auth);
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = 'job_match_digest_url' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_digest_url, 'job_match_digest_url');
  ELSE
    PERFORM vault.update_secret(v_id, v_digest_url);
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = 'job_match_digest_auth' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_digest_auth, 'job_match_digest_auth');
  ELSE
    PERFORM vault.update_secret(v_id, v_digest_auth);
  END IF;
END;
`$`$;
"@

$cronSql = @'
DO $$
DECLARE
  v_match_url text;
  v_match_auth text;
  v_digest_url text;
  v_digest_auth text;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'job match cron skipped (extensions): %', SQLERRM;
    RETURN;
  END;

  SELECT decrypted_secret INTO v_match_url
  FROM vault.decrypted_secrets WHERE name = 'job_match_url' LIMIT 1;
  SELECT decrypted_secret INTO v_match_auth
  FROM vault.decrypted_secrets WHERE name = 'job_match_auth' LIMIT 1;
  SELECT decrypted_secret INTO v_digest_url
  FROM vault.decrypted_secrets WHERE name = 'job_match_digest_url' LIMIT 1;
  SELECT decrypted_secret INTO v_digest_auth
  FROM vault.decrypted_secrets WHERE name = 'job_match_digest_auth' LIMIT 1;

  IF v_match_url IS NOT NULL AND v_match_auth IS NOT NULL
     AND length(trim(v_match_url)) > 0 AND length(trim(v_match_auth)) > 0 THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'trabage_job_match_outbox_retry';

    PERFORM cron.schedule(
      'trabage_job_match_outbox_retry',
      '*/5 * * * *',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('process_outbox', true, 'limit', 10)
        );
        $cron$,
        trim(v_match_url),
        trim(v_match_auth),
        trim(v_match_auth)
      )
    );

    RAISE NOTICE 'Scheduled trabage_job_match_outbox_retry (*/5 * * * *)';
  END IF;

  IF v_digest_url IS NOT NULL AND v_digest_auth IS NOT NULL
     AND length(trim(v_digest_url)) > 0 AND length(trim(v_digest_auth)) > 0 THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('trabage_job_match_digest_daily', 'trabage_job_match_digest_weekly');

    PERFORM cron.schedule(
      'trabage_job_match_digest_daily',
      '0 8 * * *',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('frequency', 'daily', 'limit', 50)
        );
        $cron$,
        trim(v_digest_url),
        trim(v_digest_auth),
        trim(v_digest_auth)
      )
    );

    PERFORM cron.schedule(
      'trabage_job_match_digest_weekly',
      '0 8 * * 1',
      format(
        $cron$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L,
            'apikey', %L
          ),
          body := jsonb_build_object('frequency', 'weekly', 'limit', 50)
        );
        $cron$,
        trim(v_digest_url),
        trim(v_digest_auth),
        trim(v_digest_auth)
      )
    );

    RAISE NOTICE 'Scheduled job match digest crons (daily 08:00 UTC, weekly Mon 08:00 UTC)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule job match crons: %', SQLERRM;
END;
$$;
'@

$encodedPassword = [Uri]::EscapeDataString($DbPassword)
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"

Write-Host "1) Upserting vault secrets job_match_* ..."
& $supabaseExe db query --db-url $dbUrl $vaultSql
if ($LASTEXITCODE -ne 0) { throw "Vault upsert failed" }

Write-Host "2) Scheduling pg_cron jobs (retry + digest)..."
& $supabaseExe db query --db-url $dbUrl $cronSql
if ($LASTEXITCODE -ne 0) { throw "Cron schedule failed" }

Write-Host "3) Verifying vault secrets..."
& $supabaseExe db query --db-url $dbUrl "SELECT name, created_at, updated_at FROM vault.secrets WHERE name IN ('job_match_url','job_match_auth','job_match_digest_url','job_match_digest_auth') ORDER BY name;"
if ($LASTEXITCODE -ne 0) { throw "Vault verification failed" }

Write-Host "4) Verifying cron jobs..."
& $supabaseExe db query --db-url $dbUrl "SELECT jobname, schedule, active FROM cron.job WHERE jobname IN ('trabage_job_match_outbox_retry','trabage_job_match_digest_daily','trabage_job_match_digest_weekly') ORDER BY jobname;"
if ($LASTEXITCODE -ne 0) { throw "Cron verification failed" }

Write-Host "Job match vault + cron setup complete."
