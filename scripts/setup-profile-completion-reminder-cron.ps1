param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl",
  [string]$DbPassword = "ZARRELTECHCREW"
)

$ErrorActionPreference = "Stop"
$supabaseExe = "C:\Tools\supabase\supabase.exe"
$tokenPath = Join-Path $env:USERPROFILE ".supabase\access-token.txt"

if (-not (Test-Path $supabaseExe)) { throw "Missing $supabaseExe" }
if (-not (Test-Path $tokenPath)) { throw "Missing access token. Run scripts\supabase-login.cmd" }

$token = (Get-Content $tokenPath -Raw).Trim()
$fnUrl = "https://$ProjectRef.supabase.co/functions/v1/send_profile_completion_reminder"

# Dedicated webhook secret (not service_role JWT) — matches Edge Function x-profile-reminder-secret
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$webhookSecret = -join ($bytes | ForEach-Object { $_.ToString('x2') })

Write-Host "1) Setting Edge Function secret PROFILE_COMPLETION_REMINDER_SECRET..."
$secretBody = @(
  @{ name = "PROFILE_COMPLETION_REMINDER_SECRET"; value = $webhookSecret }
) | ConvertTo-Json -Compress
# Management API expects an array
if (-not $secretBody.StartsWith('[')) {
  $secretBody = "[$secretBody]"
}

Invoke-RestMethod -Method Post `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/secrets" `
  -Headers @{
    Authorization = "Bearer $token"
    Accept = "application/json"
    "Content-Type" = "application/json"
  } `
  -Body $secretBody | Out-Null

Write-Host "2) Upserting vault secrets (URL + webhook auth)..."

function Escape-Sql([string]$value) {
  return $value.Replace("'", "''")
}

$vaultSql = @"
DO `$`$
DECLARE
  v_url TEXT := '$(Escape-Sql $fnUrl)';
  v_key TEXT := '$(Escape-Sql $webhookSecret)';
  v_url_id UUID;
  v_key_id UUID;
BEGIN
  SELECT id INTO v_url_id FROM vault.secrets WHERE name = 'profile_completion_reminder_url' LIMIT 1;
  IF v_url_id IS NULL THEN
    PERFORM vault.create_secret(v_url, 'profile_completion_reminder_url');
  ELSE
    PERFORM vault.update_secret(v_url_id, v_url);
  END IF;

  SELECT id INTO v_key_id FROM vault.secrets WHERE name = 'profile_completion_reminder_auth' LIMIT 1;
  IF v_key_id IS NULL THEN
    PERFORM vault.create_secret(v_key, 'profile_completion_reminder_auth');
  ELSE
    PERFORM vault.update_secret(v_key_id, v_key);
  END IF;
END;
`$`$;
"@

$encodedPassword = [Uri]::EscapeDataString($DbPassword)
$dbUrl = "postgresql://postgres.${ProjectRef}:$encodedPassword@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

& $supabaseExe db query --db-url $dbUrl $vaultSql
if ($LASTEXITCODE -ne 0) { throw "Vault upsert failed" }

Write-Host "3) Scheduling pg_cron job..."

$cronSql = @'
DO $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'profile_completion_reminder_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'profile_completion_reminder_auth' LIMIT 1;

  IF v_url IS NULL OR v_key IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_key)) = 0 THEN
    RAISE EXCEPTION 'Vault secrets missing after upsert';
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'trabage_profile_completion_reminder';

  PERFORM cron.schedule(
    'trabage_profile_completion_reminder',
    '*/5 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'x-profile-reminder-secret', %L
        ),
        body := jsonb_build_object('source', 'cron', 'limit', 20)
      );
      $cron$,
      trim(v_url),
      trim(v_key),
      trim(v_key),
      trim(v_key)
    )
  );

  RAISE NOTICE 'Scheduled trabage_profile_completion_reminder cron (*/5)';
END;
$$;
'@

& $supabaseExe db query --db-url $dbUrl $cronSql
if ($LASTEXITCODE -ne 0) { throw "Cron schedule failed" }

$verifySql = "SELECT jobid::text AS jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'trabage_profile_completion_reminder';"
& $supabaseExe db query --db-url $dbUrl $verifySql
if ($LASTEXITCODE -ne 0) { throw "Cron verify failed" }

Write-Host "4) Smoke-invoking Edge Function..."
$invokeHeaders = @{
  "x-profile-reminder-secret" = $webhookSecret
  "Content-Type" = "application/json"
}
try {
  $resp = Invoke-RestMethod -Method Post `
    -Uri $fnUrl `
    -Headers $invokeHeaders `
    -Body '{"source":"setup_smoke","limit":1}'
  Write-Host ("Smoke OK: claimed={0}" -f $resp.claimed)
} catch {
  $status = $null
  if ($_.Exception.Response) {
    $status = [int]$_.Exception.Response.StatusCode
  }
  Write-Host ("Smoke warn: HTTP {0} {1}" -f $status, $_.Exception.Message)
  throw
}

$webhookSecret = $null
Write-Host "Done. Cron every 5 min + vault + EF secret configured."
