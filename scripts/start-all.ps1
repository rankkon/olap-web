$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-File", (Join-Path $PSScriptRoot "start-FE.ps1")
Start-Process powershell -ArgumentList "-NoExit", "-File", (Join-Path $PSScriptRoot "start-BE.ps1")

Write-Host "Da mo 2 cua so rieng cho FE va BE."
