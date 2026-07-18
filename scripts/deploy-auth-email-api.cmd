@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-auth-email-api.ps1" %*
