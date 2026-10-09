@echo off
title Indoor Air Quality Analysis Platform Launcher
echo ========================================================
echo   Indoor Air Quality Analysis Platform Launcher
echo ========================================================
echo.

:: Navigate to project root directory
cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend (http://127.0.0.1:8000)...
start "FastAPI Backend" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Vite Frontend UI (http://localhost:3000)...
start "React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   Application started successfully!
echo   - Backend API Docs : http://127.0.0.1:8000/docs
echo   - Frontend UI       : http://localhost:3000
echo ========================================================
echo.
pause
