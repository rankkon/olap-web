using DwhOlap.Api.Models;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class BanHangController : ControllerBase
{
    private readonly IReportService _reportService;

    public BanHangController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("doanhthu-theo-nam")]
    public async Task<ActionResult<ApiEnvelope<ReportResponse>>> GetDoanhThuTheoNam(CancellationToken cancellationToken)
    {
        var report = await _reportService.GetDoanhThuTheoNamAsync(cancellationToken);

        return Ok(new ApiEnvelope<ReportResponse>
        {
            Success = true,
            Message = "MDX query executed.",
            Data = report
        });
    }

    [HttpGet("doanhthu-theo-thang")]
    public async Task<ActionResult<ApiEnvelope<ReportResponse>>> GetDoanhThuTheoThang(
        [FromQuery] int year,
        CancellationToken cancellationToken)
    {
        if (year <= 0)
        {
            return BadRequest(new ApiEnvelope<ReportResponse>
            {
                Success = false,
                Message = "Query parameter 'year' is required and must be > 0."
            });
        }

        var report = await _reportService.GetDoanhThuTheoThangAsync(year, cancellationToken);

        return Ok(new ApiEnvelope<ReportResponse>
        {
            Success = true,
            Message = "MDX query executed.",
            Data = report
        });
    }
}
