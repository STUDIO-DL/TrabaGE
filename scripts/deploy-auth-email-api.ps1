param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl"
)

$ErrorActionPreference = "Stop"

$tokenPath = Join-Path $env:USERPROFILE ".supabase\access-token.txt"
$functionName = "send_auth_email"
$functionDir = Resolve-Path (Join-Path $PSScriptRoot "..\supabase\functions\$functionName")
$sharedDir = Resolve-Path (Join-Path $PSScriptRoot "..\supabase\functions\_shared")

if (-not (Test-Path $tokenPath)) {
  throw "No se encontro $tokenPath. Ejecuta scripts\supabase-login.cmd primero."
}

$token = (Get-Content $tokenPath -Raw).Trim()
if (-not $token) {
  throw "El token esta vacio. Ejecuta scripts\supabase-login.cmd de nuevo."
}

Add-Type -AssemblyName System.Net.Http

$url = "https://api.supabase.com/v1/projects/$ProjectRef/functions/deploy?slug=$functionName"
$client = [System.Net.Http.HttpClient]::new()
$form = [System.Net.Http.MultipartFormDataContent]::new()

try {
  $client.DefaultRequestHeaders.Authorization =
    [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)

  $metadata = @{
    name = $functionName
    entrypoint_path = "index.ts"
    verify_jwt = $false
  } | ConvertTo-Json -Compress

  $metadataContent = [System.Net.Http.StringContent]::new($metadata)
  $form.Add($metadataContent, "metadata")

  $files = @(
    @{ Path = (Join-Path $functionDir "index.ts"); Name = "index.ts" },
    @{ Path = (Join-Path $functionDir "templates.ts"); Name = "templates.ts" },
    @{ Path = (Join-Path $sharedDir "resend.ts"); Name = "../_shared/resend.ts" },
    @{ Path = (Join-Path $sharedDir "smtp.ts"); Name = "../_shared/smtp.ts" },
    @{ Path = (Join-Path $sharedDir "authEmailDelivery.ts"); Name = "../_shared/authEmailDelivery.ts" }
  )

  foreach ($file in $files) {
    if (-not (Test-Path $file.Path)) {
      throw "No se encontro $($file.Path)"
    }

    $bytes = [System.IO.File]::ReadAllBytes($file.Path)
    $fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
    $fileContent.Headers.ContentType =
      [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/typescript")
    $form.Add($fileContent, "file", $file.Name)
  }

  Write-Host "Desplegando $functionName en $ProjectRef via Supabase Management API..."
  $response = $client.PostAsync($url, $form).GetAwaiter().GetResult()
  $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

  if (-not $response.IsSuccessStatusCode) {
    Write-Host $body
    throw "Deploy fallido: HTTP $([int]$response.StatusCode) $($response.ReasonPhrase)"
  }

  Write-Host "Deploy completado."
  if ($body) {
    Write-Host $body
  }
}
finally {
  $form.Dispose()
  $client.Dispose()
}
