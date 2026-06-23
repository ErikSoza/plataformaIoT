@echo off
title Plataforma IoT - Lanzador

echo ============================================================
echo   Plataforma IoT Meteorologica - UTALCA
echo   Backend  : http://localhost:3000
echo   Frontend : http://localhost:3001
echo ============================================================
echo.

echo [1/2] Iniciando Backend (puerto 3000)...
start "Backend - Puerto 3000" cmd /k "cd /d "%~dp0backend" && node app.js"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Frontend (puerto 3001)...
start "Frontend - Puerto 3001" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Ambos servicios iniciados en ventanas separadas.
echo Cierra las ventanas de Backend y Frontend para detenerlos.
pause
