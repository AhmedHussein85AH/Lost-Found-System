@echo off
setlocal ENABLEEXTENSIONS

REM Ensure we run from the script's directory
cd /d "%~dp0"

REM Title for clarity (quote to handle &)
title "Lost & Found System - Starter"

set "NODE_ENV=development"

echo ==============================================
echo   Lost ^& Found System - Quick Starter (Windows)
echo ==============================================

echo Checking dependencies...
if not exist node_modules (
  echo node_modules not found. Installing dependencies...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo Failed to install dependencies. Exiting.
    goto :end
  )
) else (
  echo Dependencies found.
)

set "NODEMON_PATH=%CD%\node_modules\nodemon\bin\nodemon.js"

echo.
if exist "%NODEMON_PATH%" (
  echo Starting in development mode using local nodemon...
  node "%NODEMON_PATH%" --exitcrash server.js
  if errorlevel 1 (
    echo Dev start crashed. Trying direct node start...
    node server.js
    if errorlevel 1 (
      echo Failed to start the application.
      goto :end
    )
  )
) else (
  echo nodemon not found locally. Starting with node...
  node server.js
  if errorlevel 1 (
    echo Failed to start the application.
    goto :end
  )
)

:end
echo.
echo Press any key to close this window.
pause >nul
endlocal
