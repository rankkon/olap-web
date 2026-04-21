using System.Globalization;
using System.Text;
using DwhOlap.Api.Models;
using DwhOlap.Api.Options;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace DwhOlap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class OlapController : ControllerBase
{
    private static readonly string[] BanHangDimensionOrder =
    {
        "time",
        "customer",
        "product"
    };

    private static readonly string[] TonKhoDimensionOrder =
    {
        "time",
        "store",
        "product"
    };

    private readonly ISsasQueryService _ssasQueryService;
    private readonly IOptionsMonitor<SsasOptions> _optionsMonitor;

    public OlapController(ISsasQueryService ssasQueryService, IOptionsMonitor<SsasOptions> optionsMonitor)
    {
        _ssasQueryService = ssasQueryService;
        _optionsMonitor = optionsMonitor;
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

    [HttpGet("metadata")]
    public async Task<ActionResult<ApiEnvelope<OlapMetadataResponse>>> Metadata(CancellationToken cancellationToken)
    {
        try
        {
            var options = _optionsMonitor.CurrentValue;
            var metadata = await BuildMetadataFromSsasAsync(options, cancellationToken);

            return Ok(new ApiEnvelope<OlapMetadataResponse>
            {
                Success = true,
                Message = "OLAP metadata fetched from SSAS.",
                Data = metadata
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new ApiEnvelope<OlapMetadataResponse>
            {
                Success = false,
                Message = $"Failed to fetch OLAP metadata from SSAS: {ex.Message}"
            });
        }
    }

    private async Task<OlapMetadataResponse> BuildMetadataFromSsasAsync(
        SsasOptions options,
        CancellationToken cancellationToken)
    {
        var cubes = BuildCubeConfigs(options);
        var result = new List<OlapMeasureMetadata>();
        var usedMeasureKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var cube in cubes)
        {
            var dimensions = await LoadDimensionsAsync(cube, cancellationToken);
            if (dimensions.Count == 0)
            {
                continue;
            }

            var measures = await QuerySchemaAsync(
                $"SELECT * FROM $SYSTEM.MDSCHEMA_MEASURES WHERE CUBE_NAME = '{EscapeLiteral(cube.CubeName)}'",
                cancellationToken);

            foreach (var row in measures.Rows)
            {
                if (!IsVisibleMeasure(row))
                {
                    continue;
                }

                var measureUniqueName = GetValue(row, "MEASURE_UNIQUE_NAME");
                var measureCaption = GetValue(row, "MEASURE_CAPTION", "MEASURE_NAME");
                if (string.IsNullOrWhiteSpace(measureUniqueName) && string.IsNullOrWhiteSpace(measureCaption))
                {
                    continue;
                }

                var measureExpression = BuildMeasureExpression(measureUniqueName, measureCaption);
                var measureLabel = string.IsNullOrWhiteSpace(measureCaption)
                    ? ExtractCaption(measureExpression)
                    : measureCaption;
                var key = BuildUniqueMeasureKey(
                    ResolveMeasureKey(cube.CubeType, measureUniqueName, measureLabel, options),
                    usedMeasureKeys);

                result.Add(new OlapMeasureMetadata
                {
                    Key = key,
                    Label = measureLabel,
                    CubeType = cube.CubeType,
                    CubeName = cube.CubeName,
                    MeasureExpression = measureExpression,
                    Dimensions = dimensions
                });
            }
        }

        return new OlapMetadataResponse
        {
            Measures = result
        };
    }

    private async Task<IReadOnlyList<OlapDimensionMetadata>> LoadDimensionsAsync(
        CubeConfig cube,
        CancellationToken cancellationToken)
    {
        var cubeLiteral = EscapeLiteral(cube.CubeName);

        var dimensionsTask = QuerySchemaAsync(
            $"SELECT * FROM $SYSTEM.MDSCHEMA_DIMENSIONS WHERE CUBE_NAME = '{cubeLiteral}'",
            cancellationToken);
        var hierarchiesTask = QuerySchemaAsync(
            $"SELECT * FROM $SYSTEM.MDSCHEMA_HIERARCHIES WHERE CUBE_NAME = '{cubeLiteral}'",
            cancellationToken);
        var levelsTask = QuerySchemaAsync(
            $"SELECT * FROM $SYSTEM.MDSCHEMA_LEVELS WHERE CUBE_NAME = '{cubeLiteral}'",
            cancellationToken);

        await Task.WhenAll(dimensionsTask, hierarchiesTask, levelsTask);

        var dimensionRows = dimensionsTask.Result.Rows;
        var hierarchyRows = hierarchiesTask.Result.Rows;
        var levelRows = levelsTask.Result.Rows;

        var buildersByKey = new Dictionary<string, DimensionBuilder>(StringComparer.OrdinalIgnoreCase);
        var keyByDimensionUniqueName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in dimensionRows)
        {
            var uniqueName = GetValue(row, "DIMENSION_UNIQUE_NAME", "DIMENSION_NAME");
            if (string.IsNullOrWhiteSpace(uniqueName)
                || uniqueName.Contains("[Measures]", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var key = MapDimensionKey(
                cube.CubeType,
                uniqueName,
                GetValue(row, "DIMENSION_CAPTION"),
                GetValue(row, "DIMENSION_NAME"));
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            keyByDimensionUniqueName[uniqueName] = key;

            if (!buildersByKey.ContainsKey(key))
            {
                buildersByKey[key] = new DimensionBuilder
                {
                    Key = key,
                    Label = ToDimensionLabel(key)
                };
            }
        }

        var hierarchyCaptionByUnique = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in hierarchyRows)
        {
            var unique = GetValue(row, "HIERARCHY_UNIQUE_NAME");
            if (string.IsNullOrWhiteSpace(unique))
            {
                continue;
            }

            var caption = GetValue(row, "HIERARCHY_CAPTION", "HIERARCHY_NAME");
            if (string.IsNullOrWhiteSpace(caption))
            {
                caption = ExtractCaption(unique);
            }

            hierarchyCaptionByUnique[unique] = caption;
        }

        foreach (var row in levelRows)
        {
            var dimensionUnique = GetValue(row, "DIMENSION_UNIQUE_NAME");
            if (string.IsNullOrWhiteSpace(dimensionUnique)
                || !keyByDimensionUniqueName.TryGetValue(dimensionUnique, out var dimensionKey)
                || !buildersByKey.TryGetValue(dimensionKey, out var builder))
            {
                continue;
            }

            var levelExpression = GetValue(row, "LEVEL_UNIQUE_NAME");
            if (string.IsNullOrWhiteSpace(levelExpression)
                || !builder.SeenLevelExpressions.Add(levelExpression)
                || IsAllLevel(row, levelExpression))
            {
                continue;
            }

            var hierarchyUnique = GetValue(row, "HIERARCHY_UNIQUE_NAME");
            var hierarchyLabel = GetValue(row, "HIERARCHY_CAPTION");
            if (string.IsNullOrWhiteSpace(hierarchyLabel)
                && !string.IsNullOrWhiteSpace(hierarchyUnique)
                && hierarchyCaptionByUnique.TryGetValue(hierarchyUnique, out var resolvedHierarchyCaption))
            {
                hierarchyLabel = resolvedHierarchyCaption;
            }

            var levelLabel = GetValue(row, "LEVEL_CAPTION", "LEVEL_NAME");
            if (string.IsNullOrWhiteSpace(levelLabel))
            {
                levelLabel = ExtractCaption(levelExpression);
            }

            int? hierarchyOrder = null;
            if (TryParseInt(GetValue(row, "LEVEL_NUMBER"), out var levelNumber))
            {
                hierarchyOrder = levelNumber;
            }

            var levelKey = BuildUniqueLevelKey(levelExpression, levelLabel, builder);

            builder.Levels.Add(new OlapLevelMetadata
            {
                Key = levelKey,
                Label = levelLabel,
                LevelExpression = levelExpression,
                HierarchyKey = string.IsNullOrWhiteSpace(hierarchyUnique)
                    ? null
                    : hierarchyUnique,
                HierarchyLabel = string.IsNullOrWhiteSpace(hierarchyLabel)
                    ? null
                    : hierarchyLabel,
                HierarchyOrder = hierarchyOrder
            });
        }

        var preferredOrder = cube.CubeType.Equals("tonkho", StringComparison.OrdinalIgnoreCase)
            ? TonKhoDimensionOrder
            : BanHangDimensionOrder;

        var orderedDimensionKeys = preferredOrder
            .Concat(buildersByKey.Keys.Where(key => !preferredOrder.Contains(key, StringComparer.OrdinalIgnoreCase)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return orderedDimensionKeys
            .Where(buildersByKey.ContainsKey)
            .Select(key => buildersByKey[key])
            .Select(builder => new OlapDimensionMetadata
            {
                Key = builder.Key,
                Label = builder.Label,
                Levels = builder.Levels
                    .OrderBy(level => level.HierarchyKey ?? "~", StringComparer.OrdinalIgnoreCase)
                    .ThenBy(level => level.HierarchyOrder ?? int.MaxValue)
                    .ThenBy(level => level.Label, StringComparer.OrdinalIgnoreCase)
                    .ToArray()
            })
            .Where(dimension => dimension.Levels.Count > 0)
            .ToArray();
    }

    private async Task<QueryResult> QuerySchemaAsync(string commandText, CancellationToken cancellationToken)
    {
        return await _ssasQueryService.ExecuteCommandAsync(commandText, cancellationToken);
    }

    private static IReadOnlyList<CubeConfig> BuildCubeConfigs(SsasOptions options)
    {
        var cubes = new List<CubeConfig>();

        if (!string.IsNullOrWhiteSpace(options.CubeBanHang))
        {
            cubes.Add(new CubeConfig(options.CubeBanHang.Trim(), "banhang"));
        }

        if (!string.IsNullOrWhiteSpace(options.CubeTonKho))
        {
            cubes.Add(new CubeConfig(options.CubeTonKho.Trim(), "tonkho"));
        }

        return cubes
            .GroupBy(cube => cube.CubeName, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToArray();
    }

    private static string BuildMeasureExpression(string? measureUniqueName, string? measureCaption)
    {
        if (!string.IsNullOrWhiteSpace(measureUniqueName)
            && measureUniqueName.StartsWith("[", StringComparison.Ordinal))
        {
            return measureUniqueName;
        }

        var caption = string.IsNullOrWhiteSpace(measureCaption) ? "Unknown Measure" : measureCaption;
        return $"[Measures].[{EscapeMdxName(caption)}]";
    }

    private static bool IsVisibleMeasure(IReadOnlyDictionary<string, string> row)
    {
        var raw = GetValue(row, "MEASURE_IS_VISIBLE");
        if (string.IsNullOrWhiteSpace(raw))
        {
            return true;
        }

        if (TryParseBool(raw, out var parsed))
        {
            return parsed;
        }

        return true;
    }

    private static string ResolveMeasureKey(
        string cubeType,
        string? measureUniqueName,
        string measureLabel,
        SsasOptions options)
    {
        var normalized = NormalizeText($"{measureUniqueName} {measureLabel}");

        if (cubeType.Equals("banhang", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedRevenueName = NormalizeText(options.MeasureTongDoanhThu);
            if (!string.IsNullOrWhiteSpace(normalizedRevenueName)
                && normalized.Contains(normalizedRevenueName, StringComparison.Ordinal))
            {
                return "revenue";
            }

            if (normalized.Contains("so luong hang", StringComparison.Ordinal)
                || normalized.Contains("quantity", StringComparison.Ordinal))
            {
                return "orderCount";
            }
        }

        if (cubeType.Equals("tonkho", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedInventoryName = NormalizeText(options.MeasureSoLuongTonKho);
            if (!string.IsNullOrWhiteSpace(normalizedInventoryName)
                && normalized.Contains(normalizedInventoryName, StringComparison.Ordinal))
            {
                return "inventory";
            }
        }

        var slug = ToSlug(measureLabel);
        return string.IsNullOrWhiteSpace(slug) ? $"{cubeType}_measure" : slug;
    }

    private static string BuildUniqueMeasureKey(string baseKey, ISet<string> usedKeys)
    {
        var seed = string.IsNullOrWhiteSpace(baseKey) ? "measure" : baseKey;
        var key = seed;
        var suffix = 2;

        while (!usedKeys.Add(key))
        {
            key = $"{seed}_{suffix}";
            suffix++;
        }

        return key;
    }

    private static string BuildUniqueLevelKey(string levelExpression, string levelLabel, DimensionBuilder builder)
    {
        var seed = ToSlug(levelLabel);
        if (string.IsNullOrWhiteSpace(seed))
        {
            seed = ToSlug(ExtractCaption(levelExpression));
        }

        if (string.IsNullOrWhiteSpace(seed))
        {
            seed = "level";
        }

        var key = seed;
        var suffix = 2;

        while (builder.SeenLevelKeys.Contains(key))
        {
            key = $"{seed}_{suffix}";
            suffix++;
        }

        builder.SeenLevelKeys.Add(key);
        return key;
    }

    private static bool IsAllLevel(IReadOnlyDictionary<string, string> row, string levelExpression)
    {
        if (TryParseInt(GetValue(row, "LEVEL_TYPE"), out var levelType) && levelType == 1)
        {
            return true;
        }

        var caption = GetValue(row, "LEVEL_CAPTION", "LEVEL_NAME");
        var normalizedCaption = NormalizeText(caption);
        if (normalizedCaption is "all" or "(all)")
        {
            return true;
        }

        return levelExpression.Contains("[(All)]", StringComparison.OrdinalIgnoreCase);
    }

    private static string? MapDimensionKey(
        string cubeType,
        string dimensionUniqueName,
        string dimensionCaption,
        string dimensionName)
    {
        var normalized = NormalizeText($"{dimensionUniqueName} {dimensionCaption} {dimensionName}");

        if (normalized.Contains("thoi gian", StringComparison.Ordinal)
            || normalized.Contains("time", StringComparison.Ordinal))
        {
            return "time";
        }

        if (normalized.Contains("mat hang", StringComparison.Ordinal)
            || normalized.Contains("item", StringComparison.Ordinal)
            || normalized.Contains("product", StringComparison.Ordinal))
        {
            return "product";
        }

        if (cubeType.Equals("banhang", StringComparison.OrdinalIgnoreCase)
            && (normalized.Contains("khach hang", StringComparison.Ordinal)
                || normalized.Contains("customer", StringComparison.Ordinal)))
        {
            return "customer";
        }

        if (cubeType.Equals("tonkho", StringComparison.OrdinalIgnoreCase)
            && (normalized.Contains("cua hang", StringComparison.Ordinal)
                || normalized.Contains("store", StringComparison.Ordinal)))
        {
            return "store";
        }

        if (normalized.Contains("khach hang", StringComparison.Ordinal)
            || normalized.Contains("customer", StringComparison.Ordinal))
        {
            return "customer";
        }

        if (normalized.Contains("cua hang", StringComparison.Ordinal)
            || normalized.Contains("store", StringComparison.Ordinal))
        {
            return "store";
        }

        return null;
    }

    private static string ToDimensionLabel(string key)
    {
        return key switch
        {
            "time" => "Thoi gian",
            "store" => "Cua hang",
            "product" => "Mat hang",
            "customer" => "Khach hang",
            _ => "Chieu du lieu"
        };
    }

    private static string GetValue(IReadOnlyDictionary<string, string> row, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (row.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return string.Empty;
    }

    private static string ExtractCaption(string uniqueName)
    {
        if (string.IsNullOrWhiteSpace(uniqueName))
        {
            return string.Empty;
        }

        var tokens = uniqueName
            .Split('[', ']', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .ToArray();

        return tokens.Length == 0 ? uniqueName : tokens[^1];
    }

    private static bool TryParseBool(string value, out bool result)
    {
        var trimmed = value.Trim();
        if (bool.TryParse(trimmed, out result))
        {
            return true;
        }

        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number))
        {
            result = number != 0;
            return true;
        }

        result = false;
        return false;
    }

    private static bool TryParseInt(string value, out int result)
    {
        return int.TryParse(value?.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out result);
    }

    private static string NormalizeText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.ToLowerInvariant(c));
        }

        return builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .Replace('đ', 'd');
    }

    private static string ToSlug(string value)
    {
        var normalized = NormalizeText(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(normalized.Length);
        var previousWasUnderscore = false;

        foreach (var c in normalized)
        {
            if (char.IsLetterOrDigit(c))
            {
                builder.Append(c);
                previousWasUnderscore = false;
                continue;
            }

            if (previousWasUnderscore)
            {
                continue;
            }

            builder.Append('_');
            previousWasUnderscore = true;
        }

        return builder
            .ToString()
            .Trim('_');
    }

    private static string EscapeLiteral(string value)
    {
        return value.Replace("'", "''", StringComparison.Ordinal);
    }

    private static string EscapeMdxName(string value)
    {
        return value.Replace("]", "]]", StringComparison.Ordinal);
    }

    private sealed record CubeConfig(string CubeName, string CubeType);

    private sealed class DimensionBuilder
    {
        public string Key { get; init; } = string.Empty;

        public string Label { get; init; } = string.Empty;

        public List<OlapLevelMetadata> Levels { get; } = new();

        public HashSet<string> SeenLevelExpressions { get; } = new(StringComparer.OrdinalIgnoreCase);

        public HashSet<string> SeenLevelKeys { get; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
