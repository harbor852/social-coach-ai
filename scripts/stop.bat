@echo off
echo Stopping SpeakUp AI services...

powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force"

echo Done.
pause
