@echo off
title VinhAds — Standalone Launcher (Khong Can Docker)
echo ========================================================
echo   KHOI DONG UNG DUNG CHE DO DOC LAP (KHONG CAN DOCKER)
echo ========================================================
cd /d "C:\VisualStudio\Modern SaaS Dashboard Design\frontend"
start /b cmd /c "npm run dev"
timeout /t 3 >nul
start "" "http://localhost:3001/dashboard"
exit
