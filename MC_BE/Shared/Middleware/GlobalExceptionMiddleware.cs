using System.Net;
using System.Text.Json;
using MC_BE.Core.DTOs;

namespace MC_BE.Shared.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            ArgumentException => (
                HttpStatusCode.BadRequest,
                exception.Message
            ),

            KeyNotFoundException => (
                HttpStatusCode.NotFound,
                exception.Message
            ),

            UnauthorizedAccessException => (
                HttpStatusCode.Forbidden,
                exception.Message
            ),

            InvalidOperationException => (
                HttpStatusCode.BadRequest,
                exception.Message
            ),

            _ => (
                HttpStatusCode.InternalServerError,
                "An internal server error occurred."
            )
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(
                exception,
                "An unhandled exception occurred during request processing. Path: {Path}",
                context.Request.Path
            );
        }
        else
        {
            _logger.LogWarning(
                exception,
                "Request failed with status {StatusCode}. Path: {Path}. Message: {Message}",
                (int)statusCode,
                context.Request.Path,
                exception.Message
            );
        }

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = ApiResponse<object>.FailureResponse(
            message,
            new List<string> { exception.Message }
        );

        var json = JsonSerializer.Serialize(
            response,
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }
        );

        await context.Response.WriteAsync(json);
    }
}