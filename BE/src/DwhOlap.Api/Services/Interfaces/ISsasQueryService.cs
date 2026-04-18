using DwhOlap.Api.Models;

namespace DwhOlap.Api.Services.Interfaces;

public interface ISsasQueryService
{
    Task<SsasPingResult> PingAsync(CancellationToken cancellationToken);

    Task<QueryResult> ExecuteMdxAsync(string cube, string mdx, CancellationToken cancellationToken);

    Task<QueryResult> ExecuteCommandAsync(string commandText, CancellationToken cancellationToken);
}
