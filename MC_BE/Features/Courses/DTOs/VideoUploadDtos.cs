namespace MC_BE.Features.Courses.DTOs;

public sealed class CreateVideoUploadSessionsRequest
{
    public List<CreateVideoUploadSessionItemRequest> Files { get; set; } = [];
}

public sealed class CreateVideoUploadSessionItemRequest
{
    public int LessonId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
}

public sealed class VideoUploadSessionDto
{
    public Guid SessionId { get; set; }
    public int LessonId { get; set; }
    public string UploadUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
