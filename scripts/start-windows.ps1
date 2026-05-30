$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."
docker compose up --build -d
Write-Host "Prelegal running at http://localhost:8000"
