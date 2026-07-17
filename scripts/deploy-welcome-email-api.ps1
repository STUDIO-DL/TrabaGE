param(
  [string]$ProjectRef = "jqzbpdojwzopwuaapqgl"
)

$ErrorActionPreference = "Stop"

$tokenPath = Join-Path $env:USERPROFILE ".supabase\access-token.txt"
$functionName = "send_welcome_email"
$functionDir = Resolve-Path (Join-Path $PSScriptRoot "..\supabase\functions\$functionName")

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
    verify_jwt = $true
  } | ConvertTo-Json -Compress

  $metadataContent = [System.Net.Http.StringContent]::new($metadata)
  $form.Add($metadataContent, "metadata")

  foreach ($fileName in @(
    "index.ts",
    "emailTemplate.ts",
    "constants.ts",
    "layout.ts",
    "templates.ts",
    "resolveAccountType.ts"
  )) {
    $filePath = Join-Path $functionDir $fileName
    if (-not (Test-Path $filePath)) {
      throw "No se encontro $filePath"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
    $fileContent.Headers.ContentType =
      [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/typescript")
    $form.Add($fileContent, "file", $fileName)
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
