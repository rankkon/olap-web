using DwhOlap.Api.Options;
using DwhOlap.Api.Services;
using DwhOlap.Api.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<SsasOptions>(builder.Configuration.GetSection(SsasOptions.SectionName));
builder.Services.AddScoped<ISsasQueryService, SsasQueryService>();
builder.Services.AddScoped<IReportService, ReportService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalFE", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                var isLocalHost = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
                var isHttp = uri.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase);

                return isLocalHost && isHttp;
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("LocalFE");
app.UseAuthorization();

app.MapControllers();

app.Run();
