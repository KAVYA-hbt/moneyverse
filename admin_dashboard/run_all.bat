@echo off
REM Launches backend and frontend each in their own window.
cd /d "%~dp0"
start "Backend"  cmd /k "cd backend && run_backend.bat"
start "Frontend" cmd /k "cd frontend && run_frontend.bat"
