using MC_BE.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Courses.DTOs;

public class LessonDto
{
    public int LessonId { get; set; }
    public int CourseId { get; set; }
    public int? ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public LessonType? LessonType { get; set; } = Core.Enums.LessonType.VIDEO;
    public int OrderIndex { get; set; } = 1;
    public int DurationMinutes { get; set; } = 0;
    public bool IsPreview { get; set; } = false;
    public LessonStatus Status { get; set; } = LessonStatus.ACTIVE;
    public string? VideoUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateLessonRequest
{
    public int? ModuleId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public LessonType? LessonType { get; set; } = Core.Enums.LessonType.VIDEO;

    public int OrderIndex { get; set; } = 1;

    [Range(0, 10000)]
    public int DurationMinutes { get; set; } = 0;

    public bool IsPreview { get; set; } = false;

    public LessonStatus Status { get; set; } = LessonStatus.ACTIVE;

    public string? VideoUrl { get; set; }
}

public class UpdateLessonRequest
{
    public int? ModuleId { get; set; }

    [MaxLength(255)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    public LessonType? LessonType { get; set; }

    public int? OrderIndex { get; set; }

    [Range(0, 10000)]
    public int? DurationMinutes { get; set; }

    public bool? IsPreview { get; set; }

    public LessonStatus? Status { get; set; }

    public string? VideoUrl { get; set; }
}
