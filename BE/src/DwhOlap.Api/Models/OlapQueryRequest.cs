namespace DwhOlap.Api.Models;

public sealed class OlapQueryRequest
{
    public string Cube { get; set; } = string.Empty;

    public string Mdx { get; set; } = string.Empty;
}
