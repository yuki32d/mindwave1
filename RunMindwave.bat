@echo off
title Mindwave Launcher
echo Starting Mindwave...
cd /d "%~dp0"

:: Optional: Set a specific port if you want to force it, otherwise it defaults to 8081 or increments
set PORT=8081

echo Starting Server...
start "Mindwave Server" node server.js

echo Waiting for server to initialize...
timeout /t 4 >nul

echo Opening Browser...
start http://localhost:8082/login.html

exit
