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
        var options = _optionsMonitor.CurrentValue;
        var mdx = BuildDoanhThuTheoNamMdx(options);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);

        return new ReportResponse
        {
            ReportKey = "banhang-doanhthu-theo-nam",
            Title = "Doanh thu theo nam",
            Cube = options.CubeBanHang,
            Mdx = mdx,
            Table = table,
            Series = BuildSeries(table)
        };
    }

    public async Task<ReportResponse> GetDoanhThuTheoThangAsync(int year, CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var mdx = BuildDoanhThuTheoThangMdx(options, year);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeBanHang, mdx, cancellationToken);

        return new ReportResponse
        {
            ReportKey = "banhang-doanhthu-theo-thang",
            Title = $"Doanh thu theo thang - nam {year}",
            Cube = options.CubeBanHang,
            Mdx = mdx,
            Table = table,
            Series = BuildSeries(table)
        };
    }

    public async Task<ReportResponse> GetTonKhoTheoMatHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var mdx = BuildTonKhoTheoMatHangMdx(options);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return new ReportResponse
        {
            ReportKey = "tonkho-theo-mathang",
            Title = "Ton kho theo mat hang",
            Cube = options.CubeTonKho,
            Mdx = mdx,
            Table = table,
            Series = BuildSeries(table)
        };
    }

    public async Task<ReportResponse> GetTonKhoTheoCuaHangAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var mdx = BuildTonKhoTheoCuaHangMdx(options);
        var table = await _ssasQueryService.ExecuteMdxAsync(options.CubeTonKho, mdx, cancellationToken);

        return new ReportResponse
        {
            ReportKey = "tonkho-theo-cuahang",
            Title = "Ton kho theo cua hang",
            Cube = options.CubeTonKho,
            Mdx = mdx,
            Table = table,
            Series = BuildSeries(table)
        };
    }

    private static string BuildDoanhThuTheoNamMdx(SsasOptions options)
    {
        var measure = EscapeMdxName(options.MeasureTongDoanhThu);
        var cube = EscapeMdxName(options.CubeBanHang);

        return $@"
SELECT
    {{ [Measures].[{measure}] }} ON COLUMNS,
    NON EMPTY [Dim Thoi Gian].[Nam].[Nam].MEMBERS ON ROWS
FROM [{cube}]";
    }

    private static string BuildDoanhThuTheoThangMdx(SsasOptions options, int year)
    {
        var measure = EscapeMdxName(options.MeasureTongDoanhThu);
        var cube = EscapeMdxName(options.CubeBanHang);

        return $@"
SELECT
    {{ [Measures].[{measure}] }} ON COLUMNS,
    NON EMPTY [Dim Thoi Gian].[Thang].[Thang].MEMBERS ON ROWS
FROM [{cube}]
WHERE ( [Dim Thoi Gian].[Nam].&[{year}] )";
    }

    private static string BuildTonKhoTheoMatHangMdx(SsasOptions options)
    {
        var measure = EscapeMdxName(options.MeasureSoLuongTonKho);
        var cube = EscapeMdxName(options.CubeTonKho);

        return $@"
SELECT
    {{ [Measures].[{measure}] }} ON COLUMNS,
    NON EMPTY [Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang].MEMBERS ON ROWS
FROM [{cube}]";
    }

    private static string BuildTonKhoTheoCuaHangMdx(SsasOptions options)
    {
        var measure = EscapeMdxName(options.MeasureSoLuongTonKho);
        var cube = EscapeMdxName(options.CubeTonKho);

        return $@"
SELECT
    {{ [Measures].[{measure}] }} ON COLUMNS,
    NON EMPTY [Dim Cua Hang].[Ma Cua Hang].[Ma Cua Hang].MEMBERS ON ROWS
FROM [{cube}]";
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
}
