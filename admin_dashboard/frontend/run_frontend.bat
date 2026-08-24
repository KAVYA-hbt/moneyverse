@echo off
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
echo Starting frontend (see .env for FRONTEND_PORT/BACKEND_PORT) ...
call npm run dev
