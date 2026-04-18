using DwhOlap.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiEnvelope<object>> Get()
    {
        return Ok(new ApiEnvelope<object>
        {
            Success = true,
            Message = "Service is healthy.",
            Data = new
            {
                Service = "DwhOlap.Api"
            }
        });
    }
}
