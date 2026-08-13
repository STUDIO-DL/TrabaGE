@echo off
setlocal
cd /d "%~dp0.."

echo Desplegando Edge Functions en produccion (jqzbpdojwzopwuaapqgl)...
echo.

call scripts\supabase.cmd functions deploy send_auth_email --no-verify-jwt
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy send_welcome_email
if errorlevel 1 exit /b 1

call scripts\deploy-notify-password-changed-api.cmd
if errorlevel 1 exit /b 1

call scripts\deploy-send-account-goodbye-email-api.cmd
if errorlevel 1 exit /b 1

call scripts\deploy-send-push-api.cmd
if errorlevel 1 exit /b 1

call scripts\deploy-send-web-push-api.cmd
if errorlevel 1 exit /b 1

call scripts\deploy-profile-completion-reminder-api.cmd
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy match_job_recommendations
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy process_matching_recalc
if errorlevel 1 exit /b 1

echo.
echo Todas las funciones desplegadas.
endlocal
