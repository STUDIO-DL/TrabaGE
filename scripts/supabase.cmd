@echo off
setlocal
set "SUPABASE_INTERNAL_NO_TELEMETRY=1"
set "DO_NOT_TRACK=1"
set "SUPABASE_TOKEN_FILE=%USERPROFILE%\.supabase\access-token.txt"

if not defined SUPABASE_ACCESS_TOKEN (
  if exist "%SUPABASE_TOKEN_FILE%" (
    set /p SUPABASE_ACCESS_TOKEN=<"%SUPABASE_TOKEN_FILE%"
  )
)

"C:\Tools\supabase\supabase.exe" %*
endlocal
