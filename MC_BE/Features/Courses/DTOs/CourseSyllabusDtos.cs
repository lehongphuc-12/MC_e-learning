namespace MC_BE.Features.Courses.DTOs;

public sealed class CreateSyllabusUploadSessionRequest
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
}

public sealed class SyllabusUploadSessionDto
{
    public Guid SessionId { get; set; }
    public string UploadUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public sealed class CourseSyllabusVersionDto
{
    public int SyllabusVersionId { get; set; }
    public int CourseId { get; set; }
    public int VersionNumber { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string ReviewStatus { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedById { get; set; }
    public string? ReviewNote { get; set; }
}

public sealed class CourseSyllabusPublicOutlineDto
{
    public int CourseId { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<CourseSyllabusPublicModuleDto> Modules { get; set; } = [];
    public string? FullSyllabusFileName { get; set; }
    public int? FullSyllabusVersionId { get; set; }
    public string? FullSyllabusContentType { get; set; }
    public bool HasFullSyllabus { get; set; }
}

public sealed class CourseSyllabusPublicModuleDto
{
    public int ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int TotalDurationMinutes { get; set; }
    public List<CourseSyllabusPublicLessonDto> Lessons { get; set; } = [];
}

public sealed class CourseSyllabusPublicLessonDto
{
    public int LessonId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public bool IsPreview { get; set; }
}

public sealed class ReviewSyllabusVersionRequest
{
    public string? Note { get; set; }
}
