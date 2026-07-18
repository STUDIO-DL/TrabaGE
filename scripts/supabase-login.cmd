@echo off
setlocal

set "SUPABASE_EXE=C:\Tools\supabase\supabase.exe"
set "SUPABASE_TOKEN_FILE=%USERPROFILE%\.supabase\access-token.txt"
set "SUPABASE_INTERNAL_NO_TELEMETRY=1"
set "DO_NOT_TRACK=1"

if not exist "%SUPABASE_EXE%" (
  echo No se encontro %SUPABASE_EXE%
  exit /b 1
)

echo.
echo ========================================
echo  TrabaGE - Login Supabase CLI
echo ========================================
echo.
echo 1. Se abrira el navegador en la pagina de tokens.
echo 2. Inicia sesion en Supabase si hace falta.
echo 3. Pulsa "Generate new token".
echo 4. Copia el token y pegalo aqui abajo.
echo.

start "" "https://supabase.com/dashboard/account/tokens"

echo Pega el token y pulsa Enter:
set /p "TOKEN="

if "%TOKEN%"=="" (
  echo No se introdujo ningun token.
  exit /b 1
)

echo.
echo Guardando acceso...
"%SUPABASE_EXE%" login --token %TOKEN%
if errorlevel 1 (
  echo.
  echo Login fallido. Comprueba que el token sea correcto y no este caducado.
  exit /b 1
)

if not exist "%USERPROFILE%\.supabase" mkdir "%USERPROFILE%\.supabase"
> "%SUPABASE_TOKEN_FILE%" echo %TOKEN%
icacls "%SUPABASE_TOKEN_FILE%" /inheritance:r /grant:r "%USERNAME%:R" >nul 2>nul

echo.
echo Login correcto. Ya puedes usar:
echo   scripts\supabase.cmd link --project-ref jqzbpdojwzopwuaapqgl
echo   scripts\supabase.cmd functions deploy send_auth_email --no-verify-jwt
echo   scripts\supabase.cmd functions deploy send_welcome_email
echo.
endlocal
