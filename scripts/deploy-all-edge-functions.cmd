@echo off
setlocal
cd /d "%~dp0.."

echo Desplegando Edge Functions en produccion (jqzbpdojwzopwuaapqgl)...
echo.

call scripts\supabase.cmd functions deploy send_auth_email --no-verify-jwt
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy send_welcome_email
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy send_push
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy match_job_recommendations
if errorlevel 1 exit /b 1

call scripts\supabase.cmd functions deploy process_matching_recalc
if errorlevel 1 exit /b 1

echo.
echo Todas las funciones desplegadas.
endlocal
