using DwhOlap.Api.Models;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TonKhoController : ControllerBase
{
    private readonly IReportService _reportService;

    public TonKhoController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("theo-mathang")]
    public async Task<ActionResult<ApiEnvelope<ReportResponse>>> GetTheoMatHang(CancellationToken cancellationToken)
    {
        var report = await _reportService.GetTonKhoTheoMatHangAsync(cancellationToken);

        return Ok(new ApiEnvelope<ReportResponse>
        {
            Success = true,
            Message = "MDX query executed.",
            Data = report
        });
    }

    [HttpGet("theo-cuahang")]
    public async Task<ActionResult<ApiEnvelope<ReportResponse>>> GetTheoCuaHang(CancellationToken cancellationToken)
    {
        var report = await _reportService.GetTonKhoTheoCuaHangAsync(cancellationToken);

        return Ok(new ApiEnvelope<ReportResponse>
        {
            Success = true,
            Message = "MDX query executed.",
            Data = report
        });
    }
}
