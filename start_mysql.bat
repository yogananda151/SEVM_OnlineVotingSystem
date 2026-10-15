@echo off
setlocal
echo ========================================================
echo        Smart EVM - MySQL Service Starter
echo ========================================================
echo.

:: Check for administrative rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrative permissions required to start Windows service.
    echo Requesting elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Elevated section
echo Checking MySQL97 service status...
sc query MySQL97 | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] MySQL97 service is already running!
    goto :done
)

echo Starting MySQL97 service...
net start MySQL97
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] MySQL97 service has started successfully!
    echo ========================================================
) else (
    echo.
    echo [WARNING] Could not start MySQL97. Attempting generic MySQL service...
    net start MySQL
    if %errorlevel% equ 0 (
        echo [SUCCESS] MySQL service has started successfully!
    ) else (
        echo [ERROR] Failed to start MySQL service. Please check your MySQL installation.
    )
)

:done
echo.
pause
