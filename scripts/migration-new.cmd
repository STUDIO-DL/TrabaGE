@echo off
setlocal

if "%~1"=="" (
  echo Uso: scripts\migration-new.cmd nombre_de_migracion
  exit /b 1
)

set "NAME=%~1"
set "NAME=%NAME: =_%"
set "MIGRATIONS_DIR=%~dp0..\supabase\migrations"

if not exist "%MIGRATIONS_DIR%" mkdir "%MIGRATIONS_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmmss"') do set "TS=%%i"
set "FILE=%MIGRATIONS_DIR%\%TS%_%NAME%.sql"

if exist "%FILE%" (
  echo Ya existe: %FILE%
  exit /b 1
)

type nul > "%FILE%"
echo Creada migracion: %FILE%
endlocal
