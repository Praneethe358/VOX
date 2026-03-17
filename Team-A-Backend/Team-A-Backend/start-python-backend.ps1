$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
  if (-not (Test-Path .env) -and (Test-Path .env.example)) {
    Copy-Item .env.example .env
  }

  & d:/mindkraft/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
}
finally {
  Pop-Location
}
