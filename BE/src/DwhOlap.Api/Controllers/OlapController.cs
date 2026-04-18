using System.Globalization;
using System.Text.RegularExpressions;
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
    private static readonly IReadOnlyList<AxisLevel> TimeLevels = new[]
    {
        new AxisLevel("year", "Nam", "[Dim Thoi Gian].[Nam].[Nam]"),
        new AxisLevel("quarter", "Quy", "[Dim Thoi Gian].[Quy].[Quy]"),
        new AxisLevel("month", "Thang", "[Dim Thoi Gian].[Thang].[Thang]")
    };

    private static readonly IReadOnlyDictionary<string, DimensionDefinition> BanHangDimensions =
        BuildDimensionDictionary(
            new DimensionDefinition("time", "Time", TimeLevels),
            new DimensionDefinition(
                "customer",
                "Khach hang",
                new[]
                {
                    new AxisLevel("city", "Thanh pho", "[Dim Khach Hang].[Ten Thanh Pho].[Ten Thanh Pho]"),
                    new AxisLevel("customer", "Ten khach hang", "[Dim Khach Hang].[Ten Khach Hang].[Ten Khach Hang]")
                }),
            new DimensionDefinition(
                "product",
                "Mat hang",
                new[]
                {
                    new AxisLevel("product", "Mat hang", "[Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang]")
                }));

    private static readonly IReadOnlyList<string> BanHangDimensionOrder = new[]
    {
        "time",
        "customer",
        "product"
    };

    private static readonly IReadOnlyDictionary<string, DimensionDefinition> TonKhoDimensions =
        BuildDimensionDictionary(
            new DimensionDefinition("time", "Time", TimeLevels),
            new DimensionDefinition(
                "store",
                "Cua hang",
                new[]
                {
                    new AxisLevel("state", "Bang", "[Dim Cua Hang].[Bang].[Bang]"),
                    new AxisLevel("city", "Thanh pho", "[Dim Cua Hang].[Ten Thanh Pho].[Ten Thanh Pho]"),
                    new AxisLevel("store", "Ma cua hang", "[Dim Cua Hang].[Ma Cua Hang].[Ma Cua Hang]")
                }),
            new DimensionDefinition(
                "product",
                "Mat hang",
                new[]
                {
                    new AxisLevel("product", "Mat hang", "[Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang]")
                }));

    private static readonly IReadOnlyList<string> TonKhoDimensionOrder = new[]
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
    public ActionResult<ApiEnvelope<OlapMetadataResponse>> Metadata()
    {
        var options = _optionsMonitor.CurrentValue;
        var metadata = BuildMetadata(options);

        return Ok(new ApiEnvelope<OlapMetadataResponse>
        {
            Success = true,
            Message = "OLAP metadata fetched.",
            Data = metadata
        });
    }

    [HttpPost("pivot")]
    public async Task<ActionResult<ApiEnvelope<OlapPivotResponse>>> Pivot(
        [FromBody] OlapPivotRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var options = _optionsMonitor.CurrentValue;
            var plan = BuildPlan(request, options);
            var queryResult = await _ssasQueryService.ExecuteMdxAsync(plan.Cube, plan.Mdx, cancellationToken);
            var pivot = BuildPivotResponse(plan, queryResult);

            return Ok(new ApiEnvelope<OlapPivotResponse>
            {
                Success = true,
                Message = "Pivot query executed.",
                Data = pivot
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiEnvelope<OlapPivotResponse>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    private static PivotPlan BuildPlan(OlapPivotRequest request, SsasOptions options)
    {
        var measure = ResolveMeasure(request.Measure, options);
        var dimensionMap = ResolveDimensionDefinitions(measure.CubeType);
        var availableDimensions = dimensionMap.Keys.ToArray();

        var normalizedRowDimension = NormalizeDimension(request.RowDimension, availableDimensions);
        var normalizedColumnDimension = NormalizeDimension(request.ColumnDimension, availableDimensions);
        var normalizedThirdDimension = NormalizeOptionalDimension(request.ThirdDimension, availableDimensions);

        if (normalizedRowDimension == normalizedColumnDimension)
        {
            throw new ArgumentException("'rowDimension' and 'columnDimension' must be different.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedThirdDimension)
            && (normalizedThirdDimension == normalizedRowDimension
                || normalizedThirdDimension == normalizedColumnDimension))
        {
            throw new ArgumentException("'thirdDimension' must be different from row/column dimensions.");
        }

        var topRows = Math.Clamp(request.TopRows <= 0 ? 25 : request.TopRows, 1, 250);
        var topColumns = Math.Clamp(request.TopColumns <= 0 ? 12 : request.TopColumns, 1, 48);
        var yearFilter = request.Year is > 0 ? request.Year : null;

        var rowDefinition = dimensionMap[normalizedRowDimension];
        var columnDefinition = dimensionMap[normalizedColumnDimension];
        var thirdDefinition = string.IsNullOrWhiteSpace(normalizedThirdDimension)
            ? null
            : dimensionMap[normalizedThirdDimension];

        var requestedRowLevel = ResolveRequestedLevelIndex(
            normalizedRowDimension,
            request.RowLevelIndex,
            request.HierarchyLevel);
        var requestedColumnLevel = ResolveRequestedLevelIndex(
            normalizedColumnDimension,
            request.ColumnLevelIndex,
            request.HierarchyLevel);
        var requestedThirdLevel = thirdDefinition is null
            ? 0
            : ResolveRequestedLevelIndex(
                normalizedThirdDimension!,
                request.ThirdLevelIndex,
                request.HierarchyLevel);

        var rowAxis = ResolveAxisSet(rowDefinition, requestedRowLevel, topRows);
        var columnAxis = ResolveAxisSet(
            columnDefinition,
            requestedColumnLevel,
            topColumns,
            rowAxis.LevelExpression);
        var thirdAxis = thirdDefinition is null
            ? null
            : ResolveAxisSet(
                thirdDefinition,
                requestedThirdLevel,
                topRows,
                rowAxis.LevelExpression);

        var filters = ResolveFilters(
            request.Filters ?? Array.Empty<OlapMemberFilter>(),
            dimensionMap,
            normalizedRowDimension,
            rowAxis.LevelIndex,
            normalizedColumnDimension,
            columnAxis.LevelIndex,
            normalizedThirdDimension,
            thirdAxis?.LevelIndex);

        var rowSetExpression = ApplyAxisFilter(
            rowAxis,
            filters.TryGetValue(normalizedRowDimension, out var rowFilter) ? rowFilter : null);
        var columnSetExpression = ApplyAxisFilter(
            columnAxis,
            filters.TryGetValue(normalizedColumnDimension, out var columnFilter) ? columnFilter : null);
        columnSetExpression = ApplyTopLimit(columnAxis, columnSetExpression, measure.MeasureReference);

        if (thirdAxis is null || string.IsNullOrWhiteSpace(normalizedThirdDimension))
        {
            rowSetExpression = ApplyTopLimit(rowAxis, rowSetExpression, measure.MeasureReference, columnSetExpression);
        }
        else
        {
            var thirdSetExpression = ApplyAxisFilter(
                thirdAxis,
                filters.TryGetValue(normalizedThirdDimension, out var thirdFilter) ? thirdFilter : null);
            thirdSetExpression = ApplyTopLimit(thirdAxis, thirdSetExpression, measure.MeasureReference, columnSetExpression);

            var combinedRows = $"CROSSJOIN({rowSetExpression}, {thirdSetExpression})";
            var measureSet = $"{{ {measure.MeasureReference} }}";
            var rowContextSet = $"CROSSJOIN({columnSetExpression}, {measureSet})";
            rowSetExpression = $"HEAD(NONEMPTY({combinedRows}, {rowContextSet}), {topRows})";
        }

        var nonAxisFilters = filters.Values
            .Where(filter =>
                !string.Equals(filter.Dimension, normalizedRowDimension, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(filter.Dimension, normalizedColumnDimension, StringComparison.OrdinalIgnoreCase)
                && (string.IsNullOrWhiteSpace(normalizedThirdDimension)
                    || !string.Equals(filter.Dimension, normalizedThirdDimension, StringComparison.OrdinalIgnoreCase)))
            .OrderBy(filter => filter.Dimension, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var fromExpression = BuildFromExpression(measure.CubeName, nonAxisFilters);

        var whereItems = new List<string> { measure.MeasureReference };
        if (yearFilter.HasValue && !filters.ContainsKey("time"))
        {
            whereItems.Add($"[Dim Thoi Gian].[Nam].&[{yearFilter.Value}]");
        }

        var withClause = string.IsNullOrWhiteSpace(measure.WithMember) ? string.Empty : $"{measure.WithMember}\n";
        var mdx = $@"
{withClause}SELECT
    NON EMPTY {columnSetExpression} ON COLUMNS,
    NON EMPTY {rowSetExpression} ON ROWS
FROM {fromExpression}
WHERE ( {string.Join(", ", whereItems)} )";

        return new PivotPlan
        {
            Cube = measure.CubeName,
            Measure = request.Measure,
            RowDimension = normalizedRowDimension,
            ColumnDimension = normalizedColumnDimension,
            SecondaryRowDimension = normalizedThirdDimension,
            RowLevelLabel = rowAxis.LevelLabel,
            SecondaryRowLevelLabel = thirdAxis?.LevelLabel,
            ColumnLevelLabel = columnAxis.LevelLabel,
            Mdx = mdx
        };
    }

    private static OlapPivotResponse BuildPivotResponse(PivotPlan plan, QueryResult queryResult)
    {
        var secondaryRowHeader = string.IsNullOrWhiteSpace(plan.SecondaryRowDimension)
            ? null
            : ToAxisHeaderLabel(plan.SecondaryRowDimension, plan.SecondaryRowLevelLabel ?? string.Empty);

        if (queryResult.Columns.Count == 0)
        {
            return new OlapPivotResponse
            {
                Cube = plan.Cube,
                Measure = plan.Measure,
                RowDimension = plan.RowDimension,
                ColumnDimension = plan.ColumnDimension,
                RowLevelLabel = plan.RowLevelLabel,
                ColumnLevelLabel = plan.ColumnLevelLabel,
                RowHeader = ToAxisHeaderLabel(plan.RowDimension, plan.RowLevelLabel),
                SecondaryRowHeader = secondaryRowHeader,
                ColumnHeader = ToAxisHeaderLabel(plan.ColumnDimension, plan.ColumnLevelLabel),
                Mdx = plan.Mdx
            };
        }

        var rowCaptionColumns = queryResult.Columns
            .Where(column => column.Contains("[MEMBER_CAPTION]", StringComparison.OrdinalIgnoreCase))
            .ToArray();
        if (rowCaptionColumns.Length == 0)
        {
            rowCaptionColumns = new[] { queryResult.Columns[0] };
        }

        var valueColumns = queryResult.Columns
            .Where(column => !rowCaptionColumns.Contains(column, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        var rows = new List<OlapPivotRow>(queryResult.Rows.Count);
        decimal total = 0;

        foreach (var sourceRow in queryResult.Rows)
        {
            var values = new List<decimal>(valueColumns.Length);
            foreach (var valueColumn in valueColumns)
            {
                sourceRow.TryGetValue(valueColumn, out var rawValue);
                var parsed = ParseDecimal(rawValue);
                values.Add(parsed);
                total += parsed;
            }

            sourceRow.TryGetValue(rowCaptionColumns[0], out var rawLabel);
            string? secondaryLabel = null;
            if (!string.IsNullOrWhiteSpace(plan.SecondaryRowDimension) && rowCaptionColumns.Length > 1)
            {
                sourceRow.TryGetValue(rowCaptionColumns[1], out var rawSecondaryLabel);
                secondaryLabel = FormatMemberCaption(
                    rawSecondaryLabel,
                    plan.SecondaryRowDimension,
                    plan.SecondaryRowLevelLabel ?? string.Empty);
            }

            rows.Add(new OlapPivotRow
            {
                Label = FormatMemberCaption(rawLabel, plan.RowDimension, plan.RowLevelLabel),
                SecondaryLabel = secondaryLabel,
                Values = values
            });
        }

        return new OlapPivotResponse
        {
            Cube = plan.Cube,
            Measure = plan.Measure,
            RowDimension = plan.RowDimension,
            ColumnDimension = plan.ColumnDimension,
            RowLevelLabel = plan.RowLevelLabel,
            ColumnLevelLabel = plan.ColumnLevelLabel,
            RowHeader = ToAxisHeaderLabel(plan.RowDimension, plan.RowLevelLabel),
            SecondaryRowHeader = secondaryRowHeader,
            ColumnHeader = ToAxisHeaderLabel(plan.ColumnDimension, plan.ColumnLevelLabel),
            ColumnHeaders = valueColumns
                .Select(raw => FormatMemberCaption(raw, plan.ColumnDimension, plan.ColumnLevelLabel))
                .ToArray(),
            Rows = rows,
            Total = total,
            Mdx = plan.Mdx
        };
    }

    private static OlapMetadataResponse BuildMetadata(SsasOptions options)
    {
        return new OlapMetadataResponse
        {
            Measures = new[]
            {
                new OlapMeasureMetadata
                {
                    Key = "revenue",
                    Label = "Revenue",
                    CubeType = "banhang",
                    CubeName = options.CubeBanHang,
                    Dimensions = BuildDimensionMetadata(BanHangDimensions, BanHangDimensionOrder)
                },
                new OlapMeasureMetadata
                {
                    Key = "orderCount",
                    Label = "Order Count",
                    CubeType = "banhang",
                    CubeName = options.CubeBanHang,
                    Dimensions = BuildDimensionMetadata(BanHangDimensions, BanHangDimensionOrder)
                },
                new OlapMeasureMetadata
                {
                    Key = "inventory",
                    Label = "Inventory",
                    CubeType = "tonkho",
                    CubeName = options.CubeTonKho,
                    Dimensions = BuildDimensionMetadata(TonKhoDimensions, TonKhoDimensionOrder)
                }
            }
        };
    }

    private static IReadOnlyList<OlapDimensionMetadata> BuildDimensionMetadata(
        IReadOnlyDictionary<string, DimensionDefinition> dimensionMap,
        IReadOnlyList<string> order)
    {
        return order
            .Where(dimensionMap.ContainsKey)
            .Select(key =>
            {
                var definition = dimensionMap[key];
                return new OlapDimensionMetadata
                {
                    Key = definition.Key,
                    Label = ToDimensionLabel(definition.Key),
                    Levels = definition.Levels
                        .Select(level => new OlapLevelMetadata
                        {
                            Key = level.LevelKey,
                            Label = level.LevelLabel,
                            LevelExpression = level.LevelExpression
                        })
                        .ToArray()
                };
            })
            .ToArray();
    }

    private static string ParseAxisCaption(string raw)
    {
        var keys = Regex.Matches(raw, @"&\[([^\]]+)\]");
        if (keys.Count > 0)
        {
            return keys[^1].Groups[1].Value;
        }

        var members = Regex.Matches(raw, @"\[([^\]]+)\]");
        if (members.Count == 0)
        {
            return raw;
        }

        var value = members[^1].Groups[1].Value;
        if (string.Equals(value, "MEMBER_CAPTION", StringComparison.OrdinalIgnoreCase) && members.Count >= 2)
        {
            return members[^2].Groups[1].Value;
        }

        return value;
    }

    private static string[] ParseAxisKeys(string raw)
    {
        return Regex.Matches(raw, @"&\[([^\]]+)\]")
            .Select(match => match.Groups[1].Value)
            .ToArray();
    }

    private static string FormatMemberCaption(string? raw, string dimension, string levelLabel)
    {
        var safeRaw = raw ?? string.Empty;
        var keys = ParseAxisKeys(safeRaw);
        var caption = ParseAxisCaption(safeRaw).Trim();
        if (string.IsNullOrWhiteSpace(caption))
        {
            return "-";
        }

        if (!dimension.Equals("time", StringComparison.OrdinalIgnoreCase))
        {
            return caption;
        }

        if (levelLabel.Equals("Quy", StringComparison.OrdinalIgnoreCase))
        {
            if (keys.Length >= 2)
            {
                return $"{keys[^2]} - Q{keys[^1]}";
            }

            return caption.StartsWith("Q", StringComparison.OrdinalIgnoreCase) ? caption.ToUpperInvariant() : $"Q{caption}";
        }

        if (levelLabel.Equals("Thang", StringComparison.OrdinalIgnoreCase))
        {
            if (keys.Length >= 2)
            {
                return $"{keys[^2]} - Thang {keys[^1]}";
            }

            return caption.StartsWith("Thang ", StringComparison.OrdinalIgnoreCase) ? caption : $"Thang {caption}";
        }

        if (levelLabel.Equals("Nam", StringComparison.OrdinalIgnoreCase) && keys.Length >= 1)
        {
            return keys[^1];
        }

        return caption;
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0;
        }

        if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var invariant))
        {
            return invariant;
        }

        if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.GetCultureInfo("vi-VN"), out var vi))
        {
            return vi;
        }

        return 0;
    }

    private static string NormalizeDimension(string? value, IReadOnlyCollection<string> supportedDimensions)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException($"Dimension is required. Supported dimensions: {string.Join(", ", supportedDimensions)}.");
        }

        if (!supportedDimensions.Contains(normalized, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Dimension '{value}' is not available for this measure.");
        }

        return normalized;
    }

    private static string? NormalizeOptionalDimension(string? value, IReadOnlyCollection<string> supportedDimensions)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        if (!supportedDimensions.Contains(normalized, StringComparer.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Dimension '{value}' is not available for this measure.");
        }

        return normalized;
    }

    private static MeasurePlan ResolveMeasure(string? measure, SsasOptions options)
    {
        var normalized = measure?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "revenue" => new MeasurePlan
            {
                CubeName = options.CubeBanHang,
                CubeType = "banhang",
                MeasureReference = $"[Measures].[{EscapeMdxName(options.MeasureTongDoanhThu)}]"
            },
            "ordercount" => new MeasurePlan
            {
                CubeName = options.CubeBanHang,
                CubeType = "banhang",
                MeasureReference = "[Measures].[So Luong Hang]"
            },
            "inventory" => new MeasurePlan
            {
                CubeName = options.CubeTonKho,
                CubeType = "tonkho",
                MeasureReference = $"[Measures].[{EscapeMdxName(options.MeasureSoLuongTonKho)}]"
            },
            _ => throw new ArgumentException("Measure must be one of: revenue, orderCount, inventory.")
        };
    }

    private static IReadOnlyDictionary<string, DimensionDefinition> ResolveDimensionDefinitions(string cubeType)
    {
        return cubeType switch
        {
            "banhang" => BanHangDimensions,
            "tonkho" => TonKhoDimensions,
            _ => throw new ArgumentException("Unsupported cube type.")
        };
    }

    private static AxisSelection ResolveAxisSet(
        DimensionDefinition definition,
        int requestedLevelIndex,
        int top,
        string? avoidLevelExpression = null)
    {
        var levels = definition.Levels;
        if (levels.Count == 0)
        {
            throw new ArgumentException($"No hierarchy level is configured for dimension '{definition.Key}'.");
        }

        var normalizedIndex = Math.Clamp(requestedLevelIndex, 0, levels.Count - 1);
        var orderedIndices = Enumerable.Range(0, levels.Count)
            .OrderBy(index => Math.Abs(index - normalizedIndex))
            .ThenBy(index => index)
            .ToArray();

        foreach (var index in orderedIndices)
        {
            var level = levels[index];
            if (!string.IsNullOrWhiteSpace(avoidLevelExpression)
                && string.Equals(level.LevelExpression, avoidLevelExpression, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var membersSet = $"{level.LevelExpression}.MEMBERS";
            var shouldLimit = ShouldLimitMembers(definition.Key, level.LevelKey);

            return new AxisSelection
            {
                Dimension = definition.Key,
                LevelIndex = index,
                LevelKey = level.LevelKey,
                LevelLabel = level.LevelLabel,
                LevelExpression = level.LevelExpression,
                MembersSetExpression = membersSet,
                ShouldLimit = shouldLimit,
                Top = top
            };
        }

        throw new ArgumentException(
            "Selected row/column level combination is not supported because both axes point to the same hierarchy.");
    }

    private static IReadOnlyDictionary<string, FilterSelection> ResolveFilters(
        IReadOnlyList<OlapMemberFilter> requestedFilters,
        IReadOnlyDictionary<string, DimensionDefinition> dimensionMap,
        string rowDimension,
        int rowLevelIndex,
        string columnDimension,
        int columnLevelIndex,
        string? thirdDimension = null,
        int? thirdLevelIndex = null)
    {
        var resolved = new Dictionary<string, FilterSelection>(StringComparer.OrdinalIgnoreCase);
        var supportedDimensions = dimensionMap.Keys.ToArray();

        foreach (var item in requestedFilters)
        {
            var members = (item.Members ?? Array.Empty<string>())
                .Where(member => !string.IsNullOrWhiteSpace(member))
                .Select(member => member.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (members.Length == 0)
            {
                continue;
            }

            var dimension = NormalizeDimension(item.Dimension, supportedDimensions);
            var definition = dimensionMap[dimension];

            var resolvedLevelIndex = dimension switch
            {
                var d when d.Equals(rowDimension, StringComparison.OrdinalIgnoreCase) => rowLevelIndex,
                var d when d.Equals(columnDimension, StringComparison.OrdinalIgnoreCase) => columnLevelIndex,
                var d when !string.IsNullOrWhiteSpace(thirdDimension)
                    && d.Equals(thirdDimension, StringComparison.OrdinalIgnoreCase) => thirdLevelIndex ?? rowLevelIndex,
                _ => Math.Clamp(item.LevelIndex ?? definition.Levels.Count - 1, 0, definition.Levels.Count - 1)
            };
            var level = definition.Levels[resolvedLevelIndex];

            if (resolved.TryGetValue(dimension, out var existing))
            {
                if (existing.LevelIndex != resolvedLevelIndex)
                {
                    throw new ArgumentException(
                        $"Filter '{dimension}' has conflicting level indexes in the same request.");
                }

                var mergedMembers = existing.Members
                    .Concat(members)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                resolved[dimension] = existing with
                {
                    Members = mergedMembers,
                    MemberSetExpression = BuildMemberSetExpression(level.MemberPrefix, mergedMembers)
                };
                continue;
            }

            resolved[dimension] = new FilterSelection(
                dimension,
                resolvedLevelIndex,
                level.LevelLabel,
                level.MemberPrefix,
                members,
                BuildMemberSetExpression(level.MemberPrefix, members));
        }

        return resolved;
    }

    private static string ApplyAxisFilter(AxisSelection axis, FilterSelection? filter)
    {
        return filter is null
            ? axis.MembersSetExpression
            : $"INTERSECT({filter.MemberSetExpression}, {axis.MembersSetExpression})";
    }

    private static string ApplyTopLimit(
        AxisSelection axis,
        string baseSetExpression,
        string measureReference,
        string? contextSetExpression = null)
    {
        if (!axis.ShouldLimit)
        {
            return baseSetExpression;
        }

        if (string.IsNullOrWhiteSpace(contextSetExpression))
        {
            return $"HEAD(NONEMPTY({baseSetExpression}, {{ {measureReference} }}), {axis.Top})";
        }

        var measureSet = $"{{ {measureReference} }}";
        var contextAwareSet = $"CROSSJOIN({contextSetExpression}, {measureSet})";

        return $"HEAD(NONEMPTY({baseSetExpression}, {contextAwareSet}), {axis.Top})";
    }

    private static string BuildFromExpression(string cubeName, IReadOnlyList<FilterSelection> nonAxisFilters)
    {
        var fromExpression = $"[{EscapeMdxName(cubeName)}]";

        foreach (var filter in nonAxisFilters)
        {
            fromExpression = $"( SELECT {filter.MemberSetExpression} ON 0 FROM {fromExpression} )";
        }

        return fromExpression;
    }

    private static string BuildMemberSetExpression(string memberPrefix, IReadOnlyList<string> members)
    {
        var memberExpressions = members
            .Select(member => ToMdxMemberExpression(memberPrefix, member))
            .ToArray();

        return $"{{ {string.Join(", ", memberExpressions)} }}";
    }

    private static string ToMdxMemberExpression(string memberPrefix, string member)
    {
        var normalizedMember = member.Trim();
        if (IsMemberExpression(normalizedMember))
        {
            return normalizedMember;
        }

        return $"{memberPrefix}.&[{EscapeMdxMemberKey(normalizedMember)}]";
    }

    private static bool IsMemberExpression(string member)
    {
        return member.StartsWith("[", StringComparison.Ordinal)
            && member.Contains("].&[", StringComparison.Ordinal);
    }

    private static bool ShouldLimitMembers(string dimension, string levelKey)
    {
        if (dimension == "time" && levelKey is "quarter" or "month")
        {
            return false;
        }

        return true;
    }

    private static int ResolveRequestedLevelIndex(string dimension, int? explicitLevelIndex, string? legacyHierarchyLevel)
    {
        if (explicitLevelIndex.HasValue)
        {
            return explicitLevelIndex.Value;
        }

        if (dimension == "time")
        {
            return LegacyTimeLevelToIndex(legacyHierarchyLevel);
        }

        // Default non-time axes to the most detailed level.
        return int.MaxValue;
    }

    private static int LegacyTimeLevelToIndex(string? legacyHierarchyLevel)
    {
        var normalized = legacyHierarchyLevel?.Trim().ToLowerInvariant();
        return normalized switch
        {
            "year" => 0,
            "quarter" => 1,
            "month" => 2,
            _ => 1
        };
    }

    private static string ToAxisHeaderLabel(string dimension, string levelLabel)
    {
        var dimensionLabel = ToDimensionLabel(dimension);
        return string.IsNullOrWhiteSpace(levelLabel) ? dimensionLabel : $"{dimensionLabel} ({levelLabel})";
    }

    private static string ToDimensionLabel(string dimension)
    {
        return dimension switch
        {
            "time" => "Thoi gian",
            "store" => "Cua hang",
            "product" => "Mat hang",
            "customer" => "Khach hang",
            _ => "Dimension"
        };
    }

    private static string EscapeMdxName(string value)
    {
        return value.Replace("]", "]]", StringComparison.Ordinal);
    }

    private static string EscapeMdxMemberKey(string value)
    {
        return value.Replace("]", "]]", StringComparison.Ordinal);
    }

    private static IReadOnlyDictionary<string, DimensionDefinition> BuildDimensionDictionary(
        params DimensionDefinition[] definitions)
    {
        return definitions.ToDictionary(item => item.Key, item => item, StringComparer.OrdinalIgnoreCase);
    }

    private sealed class PivotPlan
    {
        public string Cube { get; init; } = string.Empty;

        public string Measure { get; init; } = string.Empty;

        public string RowDimension { get; init; } = string.Empty;

        public string ColumnDimension { get; init; } = string.Empty;

        public string? SecondaryRowDimension { get; init; }

        public string RowLevelLabel { get; init; } = string.Empty;

        public string? SecondaryRowLevelLabel { get; init; }

        public string ColumnLevelLabel { get; init; } = string.Empty;

        public string Mdx { get; init; } = string.Empty;
    }

    private sealed class MeasurePlan
    {
        public string CubeName { get; init; } = string.Empty;

        public string CubeType { get; init; } = string.Empty;

        public string MeasureReference { get; init; } = string.Empty;

        public string? WithMember { get; init; }
    }

    private sealed class DimensionDefinition
    {
        public DimensionDefinition(string key, string label, IReadOnlyList<AxisLevel> levels)
        {
            Key = key;
            Label = label;
            Levels = levels;
        }

        public string Key { get; }

        public string Label { get; }

        public IReadOnlyList<AxisLevel> Levels { get; }
    }

    private sealed class AxisLevel
    {
        private static readonly Regex LevelExpressionPattern = new(@"^(.*)\.\[[^\]]+\]$", RegexOptions.Compiled);

        public AxisLevel(string levelKey, string levelLabel, string levelExpression)
        {
            LevelKey = levelKey;
            LevelLabel = levelLabel;
            LevelExpression = levelExpression;
            MemberPrefix = ResolveMemberPrefix(levelExpression);
        }

        public string LevelKey { get; }

        public string LevelLabel { get; }

        public string LevelExpression { get; }

        public string MemberPrefix { get; }

        private static string ResolveMemberPrefix(string levelExpression)
        {
            var match = LevelExpressionPattern.Match(levelExpression);
            return match.Success ? match.Groups[1].Value : levelExpression;
        }
    }

    private sealed class AxisSelection
    {
        public string Dimension { get; init; } = string.Empty;

        public int LevelIndex { get; init; }

        public string LevelKey { get; init; } = string.Empty;

        public string LevelLabel { get; init; } = string.Empty;

        public string LevelExpression { get; init; } = string.Empty;

        public string MembersSetExpression { get; init; } = string.Empty;

        public bool ShouldLimit { get; init; }

        public int Top { get; init; }
    }

    private sealed record FilterSelection(
        string Dimension,
        int LevelIndex,
        string LevelLabel,
        string MemberPrefix,
        IReadOnlyList<string> Members,
        string MemberSetExpression);
}
