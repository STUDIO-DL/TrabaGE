@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-notify-password-changed-api.ps1" %*
