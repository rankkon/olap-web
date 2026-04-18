namespace DwhOlap.Api.Models;

public sealed class MetricPoint
{
    public string Label { get; set; } = string.Empty;

    public decimal Value { get; set; }
}
