using System.Text.Json;
using Client.Literature.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Client.Literature.HttpHandlers;

public class ProblemDetailsHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var httpResponse = await base.SendAsync(request, cancellationToken);
        if (httpResponse.Content.Headers.ContentType?.MediaType == "application/problem+json")
        {
            using var contentStream = await httpResponse.Content.ReadAsStreamAsync(cancellationToken);
            var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            var problemDetails = await JsonSerializer.DeserializeAsync<ProblemDetails>(contentStream, jsonOptions, cancellationToken);

            throw new ManagedresponseException(problemDetails);
        }

        return httpResponse;
    }
}