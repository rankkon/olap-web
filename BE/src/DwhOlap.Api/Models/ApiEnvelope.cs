namespace DwhOlap.Api.Models;

public sealed class ApiEnvelope<T>
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public T? Data { get; set; }

    public string TimestampUtc { get; set; } = DateTime.UtcNow.ToString("O");
}
