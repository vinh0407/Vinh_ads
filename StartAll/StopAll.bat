@echo off
title ACCONTENT HUBAI — Stop All Services
echo Dang dung tat ca dich vu va process chay ngam...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
cd /d "C:\VisualStudio\Modern SaaS Dashboard Design"
docker-compose down >nul 2>&1
echo Da dung toan bo thanh cong!
timeout /t 2 >nul
exit