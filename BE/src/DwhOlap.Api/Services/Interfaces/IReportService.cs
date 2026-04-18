using DwhOlap.Api.Models;

namespace DwhOlap.Api.Services.Interfaces;

public interface IReportService
{
    Task<ReportResponse> GetDoanhThuTheoNamAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetDoanhThuTheoThangAsync(int year, CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoMatHangAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoCuaHangAsync(CancellationToken cancellationToken);
}
