@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\apply-migration-140.ps1" %*
exit /b %ERRORLEVEL%
