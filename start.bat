@echo off
chcp 65001 >nul
title Auto Content Hub - Startup

echo ========================================
echo   AUTO CONTENT HUB - STARTUP SCRIPT
echo ========================================
echo.

REM Check if Docker is running
echo [1/5] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo Docker is running.

REM Start PostgreSQL and Redis
echo [2/5] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo ERROR: Failed to start database services.
    pause
    exit /b 1
)

REM Wait for database to be ready
echo [3/5] Waiting for database to be ready...
timeout /t 5 >nul

REM Run backend migrations
echo [4/5] Running database migrations...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)
npx prisma generate
npx prisma migrate deploy
cd ..

REM Start backend in new window
echo [5/5] Starting backend server...
start "AutoHub Backend" cmd /k "cd /d C:\VisualStudio\Modern SaaS Dashboard Design\backend && npm run start:dev"

REM Wait a bit for backend to start
timeout /t 3 >nul

REM Start frontend in new window
echo Starting frontend server...
start "AutoHub Frontend" cmd /k "cd /d C:\VisualStudio\Modern SaaS Dashboard Design\frontend && npm run dev"

echo.
echo ========================================
echo   STARTUP COMPLETE!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:3001
echo API Docs: http://localhost:3000/api
echo.
echo Press any key to close this window...
pause