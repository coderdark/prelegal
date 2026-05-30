$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."
docker compose down
Write-Host "Prelegal stopped"
