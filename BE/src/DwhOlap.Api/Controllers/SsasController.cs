using DwhOlap.Api.Models;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SsasController : ControllerBase
{
    private readonly ISsasQueryService _ssasQueryService;

    public SsasController(ISsasQueryService ssasQueryService)
    {
        _ssasQueryService = ssasQueryService;
    }

    [HttpGet("test")]
    public async Task<ActionResult<ApiEnvelope<SsasPingResult>>> Test(CancellationToken cancellationToken)
    {
        var ping = await _ssasQueryService.PingAsync(cancellationToken);

        var envelope = new ApiEnvelope<SsasPingResult>
        {
            Success = ping.Connected,
            Message = ping.Message,
            Data = ping
        };

        return ping.Connected ? Ok(envelope) : BadRequest(envelope);
    }
}
