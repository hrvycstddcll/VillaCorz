$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the forecasting service virtual environment."
    }
}

& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install forecasting service dependencies."
}

& ".\.venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8001
exit $LASTEXITCODE
