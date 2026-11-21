$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv\Scripts\python.exe") -or -not (Test-Path ".venv\pyvenv.cfg")) {
    if (Test-Path ".venv") {
        Remove-Item -Recurse -Force .venv
    }
    py -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the forecasting service virtual environment."
    }
}

& ".\.venv\Scripts\python.exe" -m pip --version 2>$null
if ($LASTEXITCODE -ne 0) {
    & ".\.venv\Scripts\python.exe" -m ensurepip --upgrade
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install pip into the forecasting service virtual environment."
    }
}

& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install forecasting service dependencies."
}

& ".\.venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8001
exit $LASTEXITCODE
