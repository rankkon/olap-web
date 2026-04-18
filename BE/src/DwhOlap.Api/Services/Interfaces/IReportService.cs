using DwhOlap.Api.Models;

namespace DwhOlap.Api.Services.Interfaces;

public interface IReportService
{
    Task<ReportResponse> GetDoanhThuTheoNamAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetDoanhThuTheoQuyAsync(int year, CancellationToken cancellationToken);

    Task<ReportResponse> GetDoanhThuTheoThangAsync(int year, CancellationToken cancellationToken);

    Task<ReportResponse> GetDoanhThuAsync(string level, int? year, CancellationToken cancellationToken);

    Task<ReportResponse> GetSoLuongBanTheoMatHangAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetDoanhThuTheoThanhPhoKhachHangAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTopKhachHangTheoDoanhThuAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoBangAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoThanhPhoAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoMatHangAsync(CancellationToken cancellationToken);

    Task<ReportResponse> GetTonKhoTheoCuaHangAsync(CancellationToken cancellationToken);
}
