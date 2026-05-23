@echo off
cd /d "C:\Users\zhb\Desktop\social-coach-ai\apps\web"
set "PATH=D:\software_install\nodejs;%PATH%"

rem Check if port 3000 is already in use
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo Frontend already running on port 3000.
    pause
    exit /b 0
)

echo Starting frontend on port 3000...
node "C:\Users\zhb\Desktop\social-coach-ai\apps\web\node_modules\next\dist\bin\next" dev --port 3000
