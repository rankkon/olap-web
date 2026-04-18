using System.Globalization;
using DwhOlap.Api.Models;
using DwhOlap.Api.Options;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace DwhOlap.Api.Services;

public sealed class ReportService : IReportService
{
    private readonly ISsasQueryService _ssasQueryService;
    private readonly IOptionsMonitor<SsasOptions> _optionsMonitor;

    public ReportService(ISsasQueryService ssasQueryService, IOptionsMonitor<SsasOptions> optionsMonitor)
    {
        _ssasQueryService = ssasQueryService;
        _optionsMonitor = optionsMonitor;
    }

    public async Task<ReportResponse> GetDoanhThuTheoNamAsync(CancellationToken cancellationToken)
    {
        return await GetDoanhThuAsync("year", null, cancellationToken);
    }

    public async Task<ReportResponse> GetDoanhThuTheoQuyAsync(int year, CancellationToken cancellationToken)
    {
        return await GetDoanhThuAsync("quarter", year, cancellationToken);
    }

    public async Task<ReportResponse> GetDoanhThuTheoThangAsync(int year, CancellationToken cancellationToken)
    {
        return await GetDoanhThuAsync("month", year, cancellationToken);
    }

    public async Task<ReportResponse> GetDoanhThuAsync(string level, int? year, CancellationToken cancellationToken)
    {
        var normalizedLevel = NormalizeLevel(level);

        if ((normalizedLevel == "month" || normalizedLevel == "quarter")
            && (!year.HasValue || year.Value <= 0))
        {
            throw new ArgumentException("Query parameter 'year' is required and must be > 0 for month/quarter.");
        }

        var options = _optionsMonitor.CurrentValue;
        var mdx = BuildDoanhThuMdx(options, normalizedLevel, year);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);
        var title = normalizedLevel switch
        {
            "month" => $"Doanh thu theo thang - nam {year}",
            "quarter" => $"Doanh thu theo quy - nam {year}",
            _ => "Doanh thu theo nam"
        };

        return BuildResponse($"banhang-doanhthu-theo-{normalizedLevel}", title, options.CubeBanHang, mdx, table);
    }

    public async Task<ReportResponse> GetSoLuongBanTheoMatHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = "[Measures].[So Luong Hang]";
        var memberSet = "[Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang].MEMBERS";
        var rowSetExpression = BuildTopOrderedSet(memberSet, measureReference, 120);
        var mdx = BuildSingleAxisMdx(options.CubeBanHang, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);

        return BuildResponse(
            "banhang-soluong-theo-mathang",
            "So luong ban theo mat hang",
            options.CubeBanHang,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetDoanhThuTheoThanhPhoKhachHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureTongDoanhThu)}]";
        var rowSetExpression = "[Dim Khach Hang].[Ten Thanh Pho].[Ten Thanh Pho].MEMBERS";
        var mdx = BuildSingleAxisMdx(options.CubeBanHang, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);

        return BuildResponse(
            "banhang-doanhthu-theo-thanhpho-khachhang",
            "Doanh thu theo thanh pho khach hang",
            options.CubeBanHang,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetTopKhachHangTheoDoanhThuAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureTongDoanhThu)}]";
        var memberSet = "[Dim Khach Hang].[Ten Khach Hang].[Ten Khach Hang].MEMBERS";
        var rowSetExpression = BuildTopOrderedSet(memberSet, measureReference, 30);
        var mdx = BuildSingleAxisMdx(options.CubeBanHang, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);

        return BuildResponse(
            "banhang-top-khachhang-theo-doanhthu",
            "Top khach hang theo doanh thu",
            options.CubeBanHang,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetTonKhoTheoBangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureSoLuongTonKho)}]";
        var rowSetExpression = "[Dim Cua Hang].[Bang].[Bang].MEMBERS";
        var mdx = BuildSingleAxisMdx(options.CubeTonKho, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return BuildResponse(
            "tonkho-theo-bang",
            "Ton kho theo bang",
            options.CubeTonKho,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetTonKhoTheoThanhPhoAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureSoLuongTonKho)}]";
        var rowSetExpression = "[Dim Cua Hang].[Ten Thanh Pho].[Ten Thanh Pho].MEMBERS";
        var mdx = BuildSingleAxisMdx(options.CubeTonKho, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return BuildResponse(
            "tonkho-theo-thanhpho",
            "Ton kho theo thanh pho",
            options.CubeTonKho,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetTonKhoTheoMatHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureSoLuongTonKho)}]";
        var rowSetExpression = BuildTopOrderedSet(
            "[Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang].MEMBERS",
            measureReference,
            120);
        var mdx = BuildSingleAxisMdx(options.CubeTonKho, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return BuildResponse(
            "tonkho-theo-mathang",
            "Ton kho theo mat hang",
            options.CubeTonKho,
            mdx,
            table);
    }

    public async Task<ReportResponse> GetTonKhoTheoCuaHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureSoLuongTonKho)}]";
        var rowSetExpression = BuildTopOrderedSet(
            "[Dim Cua Hang].[Ma Cua Hang].[Ma Cua Hang].MEMBERS",
            measureReference,
            120);
        var mdx = BuildSingleAxisMdx(options.CubeTonKho, measureReference, rowSetExpression);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return BuildResponse(
            "tonkho-theo-cuahang",
            "Ton kho theo cua hang",
            options.CubeTonKho,
            mdx,
            table);
    }

    private static string BuildDoanhThuMdx(SsasOptions options, string level, int? year)
    {
        var measureReference = $"[Measures].[{EscapeMdxName(options.MeasureTongDoanhThu)}]";
        var rowSet = level switch
        {
            "month" => "[Dim Thoi Gian].[Thang].[Thang].MEMBERS",
            "quarter" => "[Dim Thoi Gian].[Quy].[Quy].MEMBERS",
            _ => "[Dim Thoi Gian].[Nam].[Nam].MEMBERS"
        };

        var whereClause = (level == "month" || level == "quarter")
            ? $"[Dim Thoi Gian].[Nam].&[{year}]"
            : null;

        return BuildSingleAxisMdx(options.CubeBanHang, measureReference, rowSet, whereClause);
    }

    private static string BuildSingleAxisMdx(
        string cubeName,
        string measureReference,
        string rowSetExpression,
        string? whereClause = null)
    {
        var cube = EscapeMdxName(cubeName);
        var where = string.IsNullOrWhiteSpace(whereClause) ? string.Empty : $"\nWHERE ( {whereClause} )";

        return $@"
SELECT
    {{ {measureReference} }} ON COLUMNS,
    NON EMPTY {rowSetExpression} ON ROWS
FROM [{cube}]{where}";
    }

    private static string BuildTopOrderedSet(string memberSetExpression, string measureReference, int topCount)
    {
        return $"HEAD(ORDER(NONEMPTY({memberSetExpression}, {{ {measureReference} }}), {measureReference}, BDESC), {topCount})";
    }

    private static ReportResponse BuildResponse(
        string reportKey,
        string title,
        string cubeName,
        string mdx,
        QueryResult table)
    {
        return new ReportResponse
        {
            ReportKey = reportKey,
            Title = title,
            Cube = cubeName,
            Mdx = mdx,
            Table = table,
            Series = BuildSeries(table)
        };
    }

    private static List<MetricPoint> BuildSeries(QueryResult table)
    {
        if (table.Columns.Count < 2)
        {
            return new List<MetricPoint>();
        }

        var keyColumn = table.Columns[0];
        var valueColumn = table.Columns[1];
        var result = new List<MetricPoint>();

        foreach (var row in table.Rows)
        {
            var label = row.TryGetValue(keyColumn, out var labelValue) ? labelValue : string.Empty;
            var rawValue = row.TryGetValue(valueColumn, out var valueText) ? valueText : "0";
            var parsed = ParseDecimal(rawValue);

            result.Add(new MetricPoint
            {
                Label = label,
                Value = parsed
            });
        }

        return result;
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

    private static string EscapeMdxName(string value)
    {
        return value.Replace("]", "]]", StringComparison.Ordinal);
    }

    private static string NormalizeLevel(string? value)
    {
        var level = value?.Trim().ToLowerInvariant();

        return level switch
        {
            "year" => "year",
            "quarter" => "quarter",
            "month" => "month",
            _ => throw new ArgumentException("Query parameter 'level' must be one of: year, quarter, month.")
        };
    }
}
