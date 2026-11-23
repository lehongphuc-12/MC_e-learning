using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Hubs;

public class LearningHub : Hub
{
    private readonly ILogger<LearningHub> _logger;

    public LearningHub(ILogger<LearningHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinCourse(int courseId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Course_{courseId}");
        _logger.LogInformation("SignalR: Client {ConnectionId} joined Course_{CourseId}", Context.ConnectionId, courseId);
    }

    public async Task LeaveCourse(int courseId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Course_{courseId}");
        _logger.LogInformation("SignalR: Client {ConnectionId} left Course_{CourseId}", Context.ConnectionId, courseId);
    }
}
