namespace DwhOlap.Api.Models;

public sealed class OlapPivotResponse
{
    public string Cube { get; set; } = string.Empty;

    public string Measure { get; set; } = string.Empty;

    public string RowDimension { get; set; } = string.Empty;

    public string ColumnDimension { get; set; } = string.Empty;

    public string RowLevelLabel { get; set; } = string.Empty;

    public string ColumnLevelLabel { get; set; } = string.Empty;

    public string RowHeader { get; set; } = string.Empty;

    public string ColumnHeader { get; set; } = string.Empty;

    public IReadOnlyList<string> ColumnHeaders { get; set; } = Array.Empty<string>();

    public IReadOnlyList<OlapPivotRow> Rows { get; set; } = Array.Empty<OlapPivotRow>();

    public decimal Total { get; set; }

    public string Mdx { get; set; } = string.Empty;
}

public sealed class OlapPivotRow
{
    public string Label { get; set; } = string.Empty;

    public IReadOnlyList<decimal> Values { get; set; } = Array.Empty<decimal>();
}
