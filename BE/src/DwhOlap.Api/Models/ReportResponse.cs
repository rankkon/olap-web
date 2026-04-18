namespace DwhOlap.Api.Models;

public sealed class ReportResponse
{
    public string ReportKey { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Cube { get; set; } = string.Empty;

    public string Mdx { get; set; } = string.Empty;

    public QueryResult Table { get; set; } = new();

    public IReadOnlyList<MetricPoint> Series { get; set; } = Array.Empty<MetricPoint>();
}
