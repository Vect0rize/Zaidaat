@echo off
title ZAIDAAT - All-India Property & Professional Services Marketplace
cd /d "%~dp0"

echo ============================================================================
echo   ZAIDAAT - All-India Property ^& Professional Services Marketplace
echo ============================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js 20+ from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [INFO] Created .env from .env.example
  )
)

if not exist "node_modules" (
  echo [SETUP] Installing backend dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "client\node_modules" (
  echo [SETUP] Installing frontend dependencies...
  call npm --prefix client install
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend dependency installation failed.
    pause
    exit /b 1
  )
)

echo [DB] Running migrations and verifying seed data...
call npm run migrate
call npm run seed

echo.
echo [START] Launching API (port 4000) and Frontend (http://localhost:3000)...
echo Press Ctrl+C in this window (or run STOP.bat) to stop the servers.
echo.

start /b node scripts\open-when-ready.mjs
call npm run dev
pause
