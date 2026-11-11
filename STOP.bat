@echo off
echo Stopping ZAIDAAT local development servers on ports 3000 and 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 :4000" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul
)
echo Done. Local servers stopped.
pause
