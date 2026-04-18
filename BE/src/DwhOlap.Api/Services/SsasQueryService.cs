using System.Diagnostics;
using DwhOlap.Api.Models;
using DwhOlap.Api.Options;
using DwhOlap.Api.Services.Interfaces;
using Microsoft.AnalysisServices.AdomdClient;
using Microsoft.Extensions.Options;

namespace DwhOlap.Api.Services;

public sealed class SsasQueryService : ISsasQueryService
{
    private readonly IOptionsMonitor<SsasOptions> _optionsMonitor;

    public SsasQueryService(IOptionsMonitor<SsasOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;
    }

    public async Task<SsasPingResult> PingAsync(CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;
        var stopwatch = Stopwatch.StartNew();
        var preview = BuildConnectionString(options, includePassword: false);

        try
        {
            string? serverVersion = null;

            await Task.Run(() =>
            {
                using var connection = new AdomdConnection(BuildConnectionString(options, includePassword: true));
                connection.Open();
                serverVersion = connection.ServerVersion;
            }, cancellationToken);

            stopwatch.Stop();

            return new SsasPingResult
            {
                Connected = true,
                Server = options.Server,
                Catalog = options.Catalog,
                ConnectionStringPreview = preview,
                ServerVersion = serverVersion,
                ElapsedMs = stopwatch.ElapsedMilliseconds,
                Message = "SSAS connection opened successfully."
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            return new SsasPingResult
            {
                Connected = false,
                Server = options.Server,
                Catalog = options.Catalog,
                ConnectionStringPreview = preview,
                ElapsedMs = stopwatch.ElapsedMilliseconds,
                Message = ex.Message
            };
        }
    }

    public async Task<QueryResult> ExecuteMdxAsync(string cube, string mdx, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cube))
        {
            throw new ArgumentException("Cube is required.", nameof(cube));
        }

        if (string.IsNullOrWhiteSpace(mdx))
        {
            throw new ArgumentException("MDX is required.", nameof(mdx));
        }

        return await ExecuteReaderAsync(mdx, cancellationToken);
    }

    public async Task<QueryResult> ExecuteCommandAsync(string commandText, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(commandText))
        {
            throw new ArgumentException("Command text is required.", nameof(commandText));
        }

        return await ExecuteReaderAsync(commandText, cancellationToken);
    }

    private async Task<QueryResult> ExecuteReaderAsync(string commandText, CancellationToken cancellationToken)
    {
        var options = _optionsMonitor.CurrentValue;

        return await Task.Run(() =>
        {
            var rows = new List<Dictionary<string, string>>();
            var columns = new List<string>();

            using var connection = new AdomdConnection(BuildConnectionString(options, includePassword: true));
            connection.Open();

            using var command = new AdomdCommand(commandText, connection)
            {
                CommandTimeout = options.ConnectionTimeoutSeconds
            };

            using var reader = command.ExecuteReader();

            for (var i = 0; i < reader.FieldCount; i++)
            {
                columns.Add(reader.GetName(i));
            }

            while (reader.Read())
            {
                var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var name = columns[i];
                    var value = reader.IsDBNull(i) ? string.Empty : Convert.ToString(reader.GetValue(i)) ?? string.Empty;
                    row[name] = value;
                }

                rows.Add(row);
            }

            return new QueryResult
            {
                Columns = columns,
                Rows = rows
            };
        }, cancellationToken);
    }

    private static string BuildConnectionString(SsasOptions options, bool includePassword)
    {
        var chunks = new List<string>
        {
            $"Data Source={options.Server}",
            $"Catalog={options.Catalog}",
            $"Connect Timeout={options.ConnectionTimeoutSeconds}"
        };

        if (options.UseIntegratedSecurity)
        {
            chunks.Add("Integrated Security=SSPI");
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(options.Username))
            {
                chunks.Add($"User ID={options.Username}");
            }

            if (!string.IsNullOrWhiteSpace(options.Password))
            {
                chunks.Add(includePassword ? $"Password={options.Password}" : "Password=***");
            }
        }

        return string.Join(';', chunks) + ';';
    }
}
