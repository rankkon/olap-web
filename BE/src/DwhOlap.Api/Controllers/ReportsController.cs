using DwhOlap.Api.Models;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiEnvelope<ReportResponse>>> GetById(
        [FromRoute] int id,
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var selectedYear = year.GetValueOrDefault(DateTime.UtcNow.Year);
        if (selectedYear <= 0)
        {
            selectedYear = DateTime.UtcNow.Year;
        }

        var report = await ResolveByIdAsync(id, selectedYear, cancellationToken);
        if (report is null)
        {
            return NotFound(new ApiEnvelope<ReportResponse>
            {
                Success = false,
                Message = "Report id is not supported."
            });
        }

        return Ok(new ApiEnvelope<ReportResponse>
        {
            Success = true,
            Message = "Report fetched.",
            Data = report
        });
    }

    private async Task<ReportResponse?> ResolveByIdAsync(int id, int year, CancellationToken cancellationToken)
    {
        return id switch
        {
            1 => await _reportService.GetTonKhoTheoCuaHangAsync(cancellationToken),
            2 => await _reportService.GetDoanhThuTheoQuyAsync(year, cancellationToken),
            3 => await _reportService.GetDoanhThuTheoThangAsync(year, cancellationToken),
            4 => await _reportService.GetSoLuongBanTheoMatHangAsync(cancellationToken),
            5 => await _reportService.GetDoanhThuTheoThanhPhoKhachHangAsync(cancellationToken),
            6 => await _reportService.GetTopKhachHangTheoDoanhThuAsync(cancellationToken),
            7 => await _reportService.GetTonKhoTheoBangAsync(cancellationToken),
            8 => await _reportService.GetTonKhoTheoThanhPhoAsync(cancellationToken),
            9 => await _reportService.GetTonKhoTheoMatHangAsync(cancellationToken),
            _ => null
        };
    }
}
