namespace DwhOlap.Api.Models;

public sealed class QueryResult
{
    public IReadOnlyList<string> Columns { get; set; } = Array.Empty<string>();

    public IReadOnlyList<Dictionary<string, string>> Rows { get; set; } = Array.Empty<Dictionary<string, string>>();

    public int RowCount => Rows.Count;
}
