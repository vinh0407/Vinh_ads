@echo off
chcp 65001 >nul
title Vince AI - Startup

echo ========================================
echo   VINCE AI - STARTUP SCRIPT
echo ========================================
echo.

REM ========================================
REM KIỂM TRA YÊU CẦU HỆ THỐNG
REM ========================================
echo [1/7] Kiểm tra Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js chưa được cài đặt!
    echo    Vui lòng cài đặt Node.js 20+ từ https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js: %node_version%

echo [2/7] Kiểm tra npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm không khả dụng!
    pause
    exit /b 1
)
echo ✓ npm: %npm_version%

echo [3/7] Kiểm tra Docker...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker không chạy. Vui lòng khởi động Docker Desktop.
    echo    Tiếp tục mà không có database? (y/n)
    set /p choice=
    if /i "%choice%" neq "y" (
        exit /b 1
    )
) else (
    echo ✓ Docker đang chạy
)

REM ========================================
REM KHỞI ĐỘNG DATABASE
REM ========================================
echo [4/7] Khởi động PostgreSQL & Redis...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo ❌ Không thể khởi động database!
    pause
    exit /b 1
)
echo ✓ Database đã sẵn sàng

REM ========================================
REM CÀI ĐẶT DEPENDENCIES
REM ========================================
echo [5/7] Cài đặt dependencies...
if not exist node_modules (
    echo    Cài đặt root dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Cài đặt thất bại!
        pause
        exit /b 1
    )
)

if not exist apps\web\node_modules (
    echo    Cài đặt frontend dependencies...
    cd apps\web && npm install
    if %errorlevel% neq 0 (
        echo ❌ Cài đặt frontend thất bại!
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
)

if not exist packages\database\node_modules (
    echo    Cài đặt database dependencies...
    cd packages\database && npm install
    if %errorlevel% neq 0 (
        echo ❌ Cài đặt database thất bại!
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
)

echo ✓ Dependencies đã sẵn sàng

REM ========================================
REM CHẠY MIGRATION DATABASE
REM ========================================
echo [6/7] Chạy database migrations...
cd packages\database
npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Prisma generate thất bại!
    cd ..\..
    pause
    exit /b 1
)
npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo ❌ Migration thất bại!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo ✓ Database migrations hoàn tất

REM ========================================
REM KHỞI ĐỘNG SERVER
REM ========================================
echo [7/7] Khởi động servers...
echo.
echo ========================================
echo   🚀 VINCE AI ĐANG KHỞI ĐỘNG
echo ========================================
echo.
echo Frontend:  http://localhost:3001
echo Backend:   http://localhost:3000
echo API Docs:  http://localhost:3000/api
echo Database:  postgresql://localhost:5432
echo Redis:     redis://localhost:6379
echo.
echo Nhấn Ctrl+C để dừng tất cả
echo ========================================
echo.

REM Khởi động backend trong cửa sổ mới
start "Vince AI Backend" cmd /k "cd backend && npm run start:dev"

REM Đợi backend khởi động
timeout /t 5 /nobreak >nul

REM Khởi động frontend trong cửa sổ mới
start "Vince AI Frontend" cmd /k "cd apps\web && npm run dev"

echo.
echo ✅ Vince AI đã khởi động thành công!
echo.
echo Mở trình duyệt và truy cập: http://localhost:3001
echo.
pause