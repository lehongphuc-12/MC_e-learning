
using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

public class ParseScriptFileRequest
{
    [Required(ErrorMessage = "Tập tin kịch bản là bắt buộc.")]
    public IFormFile File { get; set; } = null!;
}

public class UploadSampleAudioRequest
{
    [Required(ErrorMessage = "Tập tin âm thanh đọc mẫu là bắt buộc.")]
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

public class SaveScriptRequest : IValidatableObject
{
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    public SpeakingScriptType ScriptType { get; set; } = SpeakingScriptType.Scripted;
    public string? PromptContent { get; set; }
    public string? StructureHints { get; set; }
    public int? TargetDurationSeconds { get; set; }
    public string? OriginalContent { get; set; }
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;
    public int? ModuleId { get; set; }
    public int? ChapterId { get; set; }
    public int? BackgroundMusicId { get; set; }
    public int? CourseId { get; set; }
    public decimal PassingScore { get; set; } = 80.00m;
    public DateTime? DueAt { get; set; }
    public bool? IsRemedial { get; set; }
    public string? SampleAudioUrl { get; set; }
    public string? InstructorNote { get; set; }
    public List<SaveLevelDto> Levels { get; set; } = new();

    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ScriptType == SpeakingScriptType.OpenPrompt)
        {
            if (string.IsNullOrWhiteSpace(PromptContent))
            {
                yield return new ValidationResult(
                    "Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.",
                    new[] { nameof(PromptContent) });
            }
        }
        else
        {
            if (Levels == null || Levels.Count < 3)
            {
                yield return new ValidationResult(
                    "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED) cho bài nói có kịch bản.",
                    new[] { nameof(Levels) });
            }
        }
    }
}

public class CreateSpeakingScriptRequest : IValidatableObject
{
    [Required(ErrorMessage = "Khóa học là bắt buộc.")]
    public int CourseId { get; set; }
    public SpeakingScriptType ScriptType { get; set; } = SpeakingScriptType.Scripted;
    public string? PromptContent { get; set; }
    public string? StructureHints { get; set; }
    public int? TargetDurationSeconds { get; set; }
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;
    public int? ModuleId { get; set; }
    public int? ChapterId { get; set; }
    public int? BackgroundMusicId { get; set; }
    public int? LessonId { get; set; }
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    public string? OriginalContent { get; set; }
    public decimal PassingScore { get; set; } = 80.00m;
    public DateTime? DueAt { get; set; }
    public bool IsRemedial { get; set; }
    public string? SampleAudioUrl { get; set; }
    public string? InstructorNote { get; set; }
    public List<SaveLevelDto> Levels { get; set; } = new();

    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ScriptType == SpeakingScriptType.OpenPrompt)
        {
            if (string.IsNullOrWhiteSpace(PromptContent))
            {
                yield return new ValidationResult(
                    "Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.",
                    new[] { nameof(PromptContent) });
            }
        }
        else
        {
            if (Levels == null || Levels.Count < 3)
            {
                yield return new ValidationResult(
                    "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED) cho bài nói có kịch bản.",
                    new[] { nameof(Levels) });
            }
        }
    }
}

public class UpdateSpeakingScriptRequest : IValidatableObject
{
    public int? CourseId { get; set; }
    public SpeakingScriptType? ScriptType { get; set; }
    public string? PromptContent { get; set; }
    public string? StructureHints { get; set; }
    public int? TargetDurationSeconds { get; set; }
    public SpeakingScope? Scope { get; set; }
    public int? ModuleId { get; set; }
    public int? ChapterId { get; set; }
    public int? BackgroundMusicId { get; set; }
    public int? LessonId { get; set; }
    [MaxLength(500)]
    public string? Title { get; set; }
    public string? OriginalContent { get; set; }
    public decimal? PassingScore { get; set; }
    public DateTime? DueAt { get; set; }
    public bool? IsRemedial { get; set; }
    public string? SampleAudioUrl { get; set; }
    public string? InstructorNote { get; set; }
    public bool? ClearSampleAudio { get; set; }
    public List<SaveLevelDto>? Levels { get; set; }

    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ScriptType.HasValue && ScriptType.Value == SpeakingScriptType.OpenPrompt)
        {
            if (PromptContent != null && string.IsNullOrWhiteSpace(PromptContent))
            {
                yield return new ValidationResult(
                    "Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.",
                    new[] { nameof(PromptContent) });
            }
        }
    }
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
    public int? ChapterId { get; set; }
    public string? ModuleTitle { get; set; }
    public int? BackgroundMusicId { get; set; }
    public string? BackgroundMusicTitle { get; set; }
    public string? BackgroundMusicUrl { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string Scope { get; set; } = "FINAL";
    public string Title { get; set; } = string.Empty;
    public string? OriginalContent { get; set; }
    public decimal PassingScore { get; set; } = 80.00m;
    public DateTime? DueAt { get; set; }
    public bool IsRemedial { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public string Status { get; set; } = string.Empty;
    public SpeakingScriptType ScriptType { get; set; } = SpeakingScriptType.Scripted;
    public string? PromptContent { get; set; }
    public string? StructureHints { get; set; }
    public int? TargetDurationSeconds { get; set; }
    public string? SampleAudioUrl { get; set; }
    public string? InstructorNote { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<SpeakingScriptLevelDto> Levels { get; set; } = new();
    public List<SpeakingRubricCriterionDto> RubricCriteria { get; set; } = new();
}

public class SaveRubricCriterionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public bool IsMandatory { get; set; } = false;
    public int OrderIndex { get; set; } = 0;
}

public class SpeakingRubricCriterionDto
{
    public int CriterionId { get; set; }
    public int ScriptId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public bool IsMandatory { get; set; }
    public int OrderIndex { get; set; }
    public DateTime UpdatedAt { get; set; }
}
