@echo off
cd /d "%~dp0"

echo ===================================
echo   Alkaid System - Auto Setup
echo ===================================

echo [1/2] Installing/Updating dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo [2/3] Cleaning up obsolete tools...
echo [2.5/3] Installing Cloud API dependencies...
call npm install --prefix "api專案/雲端"

echo [2.8/3] Installing Video Downloader dependencies...
pip install -r "api專案/影片下載/requirements.txt"

echo [3/3] Starting Development Server...
npm run dev -- --open
pause
