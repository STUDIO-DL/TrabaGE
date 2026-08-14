@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-send-web-push-api.ps1" %*
exit /b %ERRORLEVEL%
