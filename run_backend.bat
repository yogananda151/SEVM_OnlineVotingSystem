@echo off
echo ========================================================
echo Starting Smart EVM - Python FastAPI Backend (Port 5000)
echo ========================================================

cd server
if exist venv\Scripts\python.exe (
    venv\Scripts\python run.py
) else (
    python run.py
)
pause
