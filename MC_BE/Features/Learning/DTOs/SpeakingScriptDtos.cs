using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

public class ParseScriptFileRequest
{
    [Required(ErrorMessage = "Tập tin kịch bản là bắt buộc.")]
    public IFormFile File { get; set; } = null!;
}

public class LevelPreviewDto
{
    public SpeakingLevel Level { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

public class ParsePreviewDto
{
    public bool Success { get; set; }
    public List<string> Errors { get; set; } = new();
    public string OriginalContent { get; set; } = string.Empty;
    public List<LevelPreviewDto> Levels { get; set; } = new();
}

public class SaveLevelDto
{
    [Required]
    public SpeakingLevel Level { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? CleanScriptForScoring { get; set; }
}

public class SaveScriptRequest
{
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    public string? OriginalContent { get; set; }

    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    public int? ModuleId { get; set; }

    public int? CourseId { get; set; }

    public decimal PassingScore { get; set; } = 80.00m;

    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();
}

public class CreateSpeakingScriptRequest
{
    [Required(ErrorMessage = "Khóa học là bắt buộc.")]
    public int CourseId { get; set; }

    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    public int? ModuleId { get; set; }

    public int? LessonId { get; set; }

    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    public string? OriginalContent { get; set; }

    public decimal PassingScore { get; set; } = 80.00m;

    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();
}

public class UpdateSpeakingScriptRequest
{
    public int? CourseId { get; set; }

    public SpeakingScope? Scope { get; set; }

    public int? ModuleId { get; set; }

    public int? LessonId { get; set; }

    [MaxLength(500)]
    public string? Title { get; set; }

    public string? OriginalContent { get; set; }

    public decimal? PassingScore { get; set; }

    public List<SaveLevelDto>? Levels { get; set; }
}

public class UpdateLevelContentRequest
{
    [Required(ErrorMessage = "Nội dung cấp độ không được để trống.")]
    public string Content { get; set; } = string.Empty;

    public string? CleanScriptForScoring { get; set; }
}

public class SpeakingScriptLevelDto
{
    public int LevelId { get; set; }
    public int ScriptId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? CleanScriptForScoring { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SpeakingScriptDto
{
    public int ScriptId { get; set; }
    public int? LessonId { get; set; }
    public string? LessonTitle { get; set; }
    public int? ModuleId { get; set; }
    public string? ModuleTitle { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string Scope { get; set; } = "FINAL";
    public string Title { get; set; } = string.Empty;
    public string? OriginalContent { get; set; }
    public decimal PassingScore { get; set; } = 80.00m;
    public int? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public List<SpeakingScriptLevelDto> Levels { get; set; } = new();
}
