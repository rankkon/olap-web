using System.Text;
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

    [HttpGet("cubes")]
    public async Task<ActionResult<ApiEnvelope<QueryResult>>> GetCubes(CancellationToken cancellationToken)
    {
        const string query = "SELECT * FROM $SYSTEM.MDSCHEMA_CUBES WHERE CUBE_SOURCE = 1";
        var result = await _ssasQueryService.ExecuteCommandAsync(query, cancellationToken);
        var shaped = PickColumns(result, "CUBE_NAME", "CUBE_CAPTION");

        return Ok(new ApiEnvelope<QueryResult>
        {
            Success = true,
            Message = "Cube metadata fetched.",
            Data = shaped
        });
    }

    [HttpGet("measures")]
    public async Task<ActionResult<ApiEnvelope<QueryResult>>> GetMeasures(
        [FromQuery] string cube,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cube))
        {
            return BadRequest(new ApiEnvelope<QueryResult>
            {
                Success = false,
                Message = "Query parameter 'cube' is required."
            });
        }

        var query = new StringBuilder()
            .AppendLine("SELECT *")
            .AppendLine("FROM $SYSTEM.MDSCHEMA_MEASURES")
            .AppendLine($"WHERE CUBE_NAME = '{EscapeLiteral(cube)}'")
            .ToString();

        var result = await _ssasQueryService.ExecuteCommandAsync(query, cancellationToken);
        var shaped = PickColumns(result, "MEASURE_NAME", "MEASURE_CAPTION");

        return Ok(new ApiEnvelope<QueryResult>
        {
            Success = true,
            Message = "Measure metadata fetched.",
            Data = shaped
        });
    }

    [HttpGet("dimensions")]
    public async Task<ActionResult<ApiEnvelope<QueryResult>>> GetDimensions(
        [FromQuery] string cube,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cube))
        {
            return BadRequest(new ApiEnvelope<QueryResult>
            {
                Success = false,
                Message = "Query parameter 'cube' is required."
            });
        }

        var query = new StringBuilder()
            .AppendLine("SELECT *")
            .AppendLine("FROM $SYSTEM.MDSCHEMA_DIMENSIONS")
            .AppendLine($"WHERE CUBE_NAME = '{EscapeLiteral(cube)}'")
            .ToString();

        var result = await _ssasQueryService.ExecuteCommandAsync(query, cancellationToken);
        var shaped = PickColumns(result, "DIMENSION_UNIQUE_NAME", "DIMENSION_CAPTION", "DEFAULT_HIERARCHY");

        return Ok(new ApiEnvelope<QueryResult>
        {
            Success = true,
            Message = "Dimension metadata fetched.",
            Data = shaped
        });
    }

    [HttpGet("hierarchies")]
    public async Task<ActionResult<ApiEnvelope<QueryResult>>> GetHierarchies(
        [FromQuery] string cube,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cube))
        {
            return BadRequest(new ApiEnvelope<QueryResult>
            {
                Success = false,
                Message = "Query parameter 'cube' is required."
            });
        }

        var query = new StringBuilder()
            .AppendLine("SELECT *")
            .AppendLine("FROM $SYSTEM.MDSCHEMA_HIERARCHIES")
            .AppendLine($"WHERE CUBE_NAME = '{EscapeLiteral(cube)}'")
            .ToString();

        var result = await _ssasQueryService.ExecuteCommandAsync(query, cancellationToken);
        var shaped = PickColumns(result, "DIMENSION_UNIQUE_NAME", "HIERARCHY_UNIQUE_NAME", "HIERARCHY_CAPTION");

        return Ok(new ApiEnvelope<QueryResult>
        {
            Success = true,
            Message = "Hierarchy metadata fetched.",
            Data = shaped
        });
    }

    private static QueryResult PickColumns(QueryResult source, params string[] columns)
    {
        var selectedColumns = columns
            .Where(column => source.Columns.Contains(column, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        var shapedRows = source.Rows
            .Select(row =>
            {
                var next = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var column in selectedColumns)
                {
                    next[column] = row.TryGetValue(column, out var value) ? value : string.Empty;
                }

                return next;
            })
            .ToList();

        return new QueryResult
        {
            Columns = selectedColumns,
            Rows = shapedRows
        };
    }

    private static string EscapeLiteral(string value)
    {
        return value.Replace("'", "''", StringComparison.Ordinal);
    }
}
