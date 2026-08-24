@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
)
set DATA_SOURCE=db
echo Starting backend (DATA_SOURCE=db; see .env for host/port) ...
.venv\Scripts\python -m app.main
