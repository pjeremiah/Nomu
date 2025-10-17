@echo off
echo ========================================
echo    NOMU Application - Local Development
echo ========================================
echo.

echo [1/4] Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

echo.
echo [2/4] Installing backend dependencies...
cd 01-web-application\backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Backend dependencies already installed
)

echo.
echo [3/4] Installing frontend dependencies...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Frontend dependencies already installed
)

echo.
echo [4/4] Starting development servers...
echo.

echo 🚀 Starting Backend Server (Port 5000)...
start "NOMU Backend Server" cmd /k "cd /d %~dp0\01-web-application\backend && echo Starting backend server... && npm run dev"

echo ⏳ Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo 🚀 Starting Frontend Server (Port 3000)...
start "NOMU Frontend Server" cmd /k "cd /d %~dp0\01-web-application\frontend && echo Starting frontend server... && npm start"

echo.
echo ========================================
echo    Development Servers Started!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo 📊 Health:   http://localhost:5000/api/health
echo.
echo 📝 Note: Make sure you have created the .env file in the backend directory
echo 📝 See setup-local-dev.md for detailed instructions
echo.
echo Press any key to close this window...
pause >nul
