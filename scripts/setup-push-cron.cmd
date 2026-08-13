@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\setup-push-cron.ps1" %*
exit /b %ERRORLEVEL%
