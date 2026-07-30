@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-send-account-goodbye-email-api.ps1" %*
