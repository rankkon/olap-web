$projectRoot = Join-Path $PSScriptRoot "..\FE"
Set-Location $projectRoot

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run dev
