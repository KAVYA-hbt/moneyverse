@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
)
REM Uses whatever DATA_SOURCE/BACKEND_HOST/BACKEND_PORT are set in .env.
REM For an explicit data-source choice without editing .env, use run_backend_db.bat or run_backend_mock.bat instead.
echo Starting backend (see .env for host/port) ...
.venv\Scripts\python -m app.main
