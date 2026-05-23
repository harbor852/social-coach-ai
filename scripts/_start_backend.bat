@echo off
cd /d "C:\Users\zhb\Desktop\social-coach-ai\services\api"

rem Check if port 8000 is already in use
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo Backend already running on port 8000.
    pause
    exit /b 0
)

echo Starting backend on port 8000...
"C:\Program Files\python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
