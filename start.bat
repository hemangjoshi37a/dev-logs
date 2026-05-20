@echo off
title Dev-Logs Server & Client
echo =========================================
echo       Starting Dev-Logs Platform
echo =========================================
echo.
echo Installing dependencies if missing...
call npm install --no-audit --no-fund

echo.
echo Starting Dev Server...
call npm run dev

pause
