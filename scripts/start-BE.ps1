$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
  Write-Error "Khong tim thay dotnet SDK. Cai .NET 8 SDK truoc khi chay BE."
  exit 1
}

$apiPath = Join-Path $PSScriptRoot "..\BE\src\DwhOlap.Api"
Set-Location $apiPath

dotnet restore
dotnet run
