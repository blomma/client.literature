using Microsoft.AspNetCore.HttpLogging;
using Serilog;
using Serilog.Events;
using System.Text.Json;

Log.Logger = new LoggerConfiguration().MinimumLevel
    .Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpForwarder();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = new[] { "application/javascript", "text/css", "text/javascript" };
});

builder.Host.UseSerilog(
    (context, services, configuration) =>
        configuration.ReadFrom.Configuration(context.Configuration).ReadFrom.Services(services)
);

builder.Services.AddHttpLogging(logging =>
{
    logging.RequestHeaders.Add("Referer");
    logging.RequestHeaders.Add("X-Forwarded-For");
    logging.RequestHeaders.Add("X-Forwarded-Host");
    logging.RequestHeaders.Add("X-Forwarded-Port");
    logging.RequestHeaders.Add("X-Forwarded-Proto");
    logging.RequestHeaders.Add("X-Forwarded-Server");
    logging.RequestHeaders.Add("X-Real-Ip");
    logging.RequestHeaders.Add("Upgrade-Insecure-Requests");
    logging.LoggingFields = HttpLoggingFields.All;
    logging.RequestBodyLogLimit = 4096;
    logging.ResponseBodyLogLimit = 4096;
});

var app = builder.Build();
app.UseHttpLogging();
app.UseResponseCompression();

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

app.MapForwarder(
    "/api/literature/{hour}/{minute}",
    builder.Configuration.GetConnectionString("api.literaturetime")!
);

app.UseStaticFiles(
    new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            var cacheControl =
                ctx.File.PhysicalPath != null
                    ? ctx.File.PhysicalPath.Contains("static")
                        ? "public, max-age=31536000"
                        : "no-cache"
                    : "no-cache";

            ctx.Context.Response.Headers.Append("Cache-Control", cacheControl);
        }
    }
);

app.MapFallbackToFile(
    "index.html",
    new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache");
        }
    }
);

app.Run();
