namespace DwhOlap.Api.Models;

public sealed class OlapMemberFilter
{
    public string Dimension { get; set; } = string.Empty;

    public int? LevelIndex { get; set; }

    public IReadOnlyList<string> Members { get; set; } = Array.Empty<string>();
}
