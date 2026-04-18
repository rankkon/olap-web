using DwhOlap.Api.Models;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class OlapController : ControllerBase
{
    private readonly ISsasQueryService _ssasQueryService;

    public OlapController(ISsasQueryService ssasQueryService)
    {
        _ssasQueryService = ssasQueryService;
    }

    [HttpPost("query")]
    public async Task<ActionResult<ApiEnvelope<QueryResult>>> Query(
        [FromBody] OlapQueryRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Cube) || string.IsNullOrWhiteSpace(request.Mdx))
        {
            return BadRequest(new ApiEnvelope<QueryResult>
            {
                Success = false,
                Message = "Both 'cube' and 'mdx' are required."
            });
        }

        var result = await _ssasQueryService.ExecuteMdxAsync(request.Cube, request.Mdx, cancellationToken);

        return Ok(new ApiEnvelope<QueryResult>
        {
            Success = true,
            Message = "MDX query executed.",
            Data = result
        });
    }
}
