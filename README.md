# olap-web

## Chay BE bang terminal trong Visual Studio

### 1) Can cai truoc

- .NET 8 SDK
- SQL Server Analysis Services (instance da deploy cube)
- SQL Server Management Studio (khuyen nghi de kiem tra SSAS/cube)

gõ trong terminal vs code: winget install --id Microsoft.DotNet.SDK.8 --source winget

### 2) Cau hinh ket noi SSAS

Sua file:

- `BE/src/DwhOlap.Api/appsettings.Development.json`: "Server": "tenSqlServer"

### 3) Chay BE trong terminal Visual Studio

Mo terminal (View -> Terminal), chay:

cd BE/src/DwhOlap.Api
dotnet restore
dotnet run

## API cho FE

FE dang goi cac endpoint sau:

- `GET /api/reports/{id}?year=2025`
- `POST /api/olap/pivot`
- `GET /api/ssas/test`
- `GET /api/ssas/cubes`
- `GET /api/ssas/measures?cube=CubeBanHang`
- `GET /api/ssas/dimensions?cube=CubeBanHang`
- `GET /api/ssas/hierarchies?cube=CubeBanHang`

## Cau hinh FE goi API
cd FE
npm install
npm run dev

