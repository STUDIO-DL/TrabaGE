@echo off
setlocal
cd /d "%~dp0.."
echo Desplegando send_push y send_web_push...
call scripts\deploy-send-push-api.cmd
if errorlevel 1 exit /b 1
call scripts\deploy-send-web-push-api.cmd
if errorlevel 1 exit /b 1
echo.
echo Push edge functions desplegadas.
endlocal
