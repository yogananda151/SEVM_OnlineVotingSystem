@echo off
echo ========================================================
echo Starting Smart EVM - Python FastAPI Backend (Port 5000)
echo ========================================================

sc query MySQL97 2>nul | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [INFO] MySQL97 service is not running.
    echo Attempting to start MySQL97 service...
    net start MySQL97 2>nul
    if %errorlevel% neq 0 (
        echo [NOTICE] To start MySQL, double-click 'start_mysql.bat' or start MySQL97 in Services.
    )
) else (
    echo [OK] MySQL97 service is running.
)
echo.

cd server
if exist venv\Scripts\python.exe (
    venv\Scripts\python run.py
) else (
    python run.py
)
pause
