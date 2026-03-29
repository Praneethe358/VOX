$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
  if (-not (Test-Path .env) -and (Test-Path .env.example)) {
    Copy-Item .env.example .env
  }

  $pythonCandidates = @(
    (Join-Path $scriptDir ".venv\Scripts\python.exe"),
    (Join-Path $scriptDir "..\..\..\.venv\Scripts\python.exe")
  )

  $pythonExe = $null
  foreach ($candidate in $pythonCandidates) {
    if (Test-Path $candidate) {
      $pythonExe = (Resolve-Path $candidate).Path
      break
    }
  }

  if (-not $pythonExe) {
    $pythonExe = "python"
  }

  & $pythonExe -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
}
finally {
  Pop-Location
}
