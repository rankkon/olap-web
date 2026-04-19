namespace DwhOlap.Api.Models;

public sealed class OlapMetadataResponse
{
    public IReadOnlyList<OlapMeasureMetadata> Measures { get; set; } = Array.Empty<OlapMeasureMetadata>();
}

public sealed class OlapMeasureMetadata
{
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string CubeType { get; set; } = string.Empty;

    public string CubeName { get; set; } = string.Empty;

    public string MeasureExpression { get; set; } = string.Empty;

    public IReadOnlyList<OlapDimensionMetadata> Dimensions { get; set; } = Array.Empty<OlapDimensionMetadata>();
}

public sealed class OlapDimensionMetadata
{
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public IReadOnlyList<OlapLevelMetadata> Levels { get; set; } = Array.Empty<OlapLevelMetadata>();
}

public sealed class OlapLevelMetadata
{
    public string Key { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string LevelExpression { get; set; } = string.Empty;
}
