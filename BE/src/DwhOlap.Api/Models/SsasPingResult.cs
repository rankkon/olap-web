namespace DwhOlap.Api.Models;

public sealed class SsasPingResult
{
    public bool Connected { get; set; }

    public string Server { get; set; } = string.Empty;

    public string Catalog { get; set; } = string.Empty;

    public string ConnectionStringPreview { get; set; } = string.Empty;

    public string? ServerVersion { get; set; }

    public long ElapsedMs { get; set; }

    public string Message { get; set; } = string.Empty;
}
