@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
)
set DATA_SOURCE=mock
echo Starting backend (DATA_SOURCE=mock -- in-memory digital twin preview data; see .env for host/port) ...
.venv\Scripts\python -m app.main
