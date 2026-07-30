@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-send-push-api.ps1" %*
