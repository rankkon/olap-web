namespace DwhOlap.Api.Models;

public sealed class OlapPivotRequest
{
    public string Measure { get; set; } = "revenue";

    public string RowDimension { get; set; } = "customer";

    public string ColumnDimension { get; set; } = "time";

    // Backward compatibility for older FE payloads.
    public string HierarchyLevel { get; set; } = "quarter";

    public int? RowLevelIndex { get; set; }

    public int? ColumnLevelIndex { get; set; }

    public int? Year { get; set; }

    public int TopRows { get; set; } = 25;

    public int TopColumns { get; set; } = 12;

    public IReadOnlyList<OlapMemberFilter> Filters { get; set; } = Array.Empty<OlapMemberFilter>();
}
