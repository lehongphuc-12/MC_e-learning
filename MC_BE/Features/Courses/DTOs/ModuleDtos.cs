using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MC_BE.Features.Courses.DTOs;

public class ModuleDto
{
    public int ModuleId { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int LessonsCount { get; set; }
    public int TotalDurationMinutes { get; set; }
    public List<LessonDto> Lessons { get; set; } = new();
}

public class CreateModuleRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(255, MinimumLength = 2, ErrorMessage = "Title must be between 2 and 255 characters.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "OrderIndex must be at least 1.")]
    public int OrderIndex { get; set; } = 1;
}

public class UpdateModuleRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(255, MinimumLength = 2, ErrorMessage = "Title must be between 2 and 255 characters.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "OrderIndex must be at least 1.")]
    public int OrderIndex { get; set; } = 1;
}

public class BulkImportModuleItemRequest
{
    [JsonPropertyName("moduleTitle")]
    public string ModuleTitle { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    public string EffectiveTitle => !string.IsNullOrWhiteSpace(ModuleTitle) ? ModuleTitle : Title;

    [JsonPropertyName("moduleDescription")]
    public string? ModuleDescription { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    public string? EffectiveDescription => ModuleDescription ?? Description;

    [JsonPropertyName("moduleOrderIndex")]
    public int ModuleOrderIndex { get; set; } = 1;

    [JsonPropertyName("orderIndex")]
    public int OrderIndex { get; set; } = 1;

    public int EffectiveOrderIndex => ModuleOrderIndex > 1 ? ModuleOrderIndex : OrderIndex;

    public List<CreateLessonRequest> Lessons { get; set; } = new();
}
