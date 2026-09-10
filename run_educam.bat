@echo off
title EduCam Launcher
echo ========================================================
echo        Starting EduCam Smart Classroom Platform
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "EduCam Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "EduCam Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo Both servers are launching!
echo Frontend: http://localhost:5173/
echo Backend:  http://127.0.0.1:8000/docs
echo ========================================================
timeout /t 5
start http://localhost:5173/
