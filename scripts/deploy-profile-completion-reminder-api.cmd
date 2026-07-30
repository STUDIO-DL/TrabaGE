@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-profile-completion-reminder-api.ps1" %*
endlocal
