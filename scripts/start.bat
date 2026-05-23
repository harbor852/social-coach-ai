@echo off
cd /d "%~dp0"

echo ==========================================
echo SpeakUp AI
echo ==========================================
echo.

set "PYTHON=C:\Program Files\python\python.exe"
set "NODE=D:\software_install\nodejs\node.exe"
set "BACKEND=C:\Users\zhb\Desktop\social-coach-ai\services\api"
set "FRONTEND=C:\Users\zhb\Desktop\social-coach-ai\apps\web"

echo [1/3] Starting backend...
start /d "%BACKEND%" "Backend" "%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo [2/3] Waiting...
ping -n 4 127.0.0.1 > nul

echo [3/3] Starting frontend...
start /d "%FRONTEND%" "Frontend" "%NODE%" node_modules\next\dist\bin\next dev --port 3000

echo.
echo ==========================================
echo Started! Close this window does NOT stop services.
echo Use stop.bat to stop.
echo ==========================================
echo.
pause
start http://127.0.0.1:3000
