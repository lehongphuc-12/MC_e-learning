
using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa file kịch bản đính kèm do giảng viên gửi lên để hệ thống phân tích tự động.
/// </summary>
public class ParseScriptFileRequest
{
    [Required(ErrorMessage = "Tập tin kịch bản là bắt buộc.")]
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// DTO mô tả nội dung xem trước của một cấp độ luyện nói cụ thể sau khi bóc tách từ file.
/// </summary>
public class LevelPreviewDto
{
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Sử dụng Enum đảm bảo an toàn kiểu dữ liệu (Type Safety) trong lúc compile-time, ngăn chặn việc truyền các giá trị cấp độ tùy tiện không tồn tại.
    public SpeakingLevel Level { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

/// <summary>
/// DTO trả về kết quả xem trước sau khi bóc tách file kịch bản (Preview Parsing Result).
/// Giúp giảng viên rà soát lỗi cú pháp trước khi chính thức lưu vào CSDL.
/// </summary>
public class ParsePreviewDto
{
    public bool Success { get; set; }
    public List<string> Errors { get; set; } = new();
    public string OriginalContent { get; set; } = string.Empty;
    public List<LevelPreviewDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO chứa thông tin nội dung của một cấp độ khi thực hiện lưu hoặc cập nhật kịch bản.
/// </summary>
public class SaveLevelDto
{
    [Required]
    public SpeakingLevel Level { get; set; }
    [Required]
    public string Content { get; set; } = string.Empty;
    public string? CleanScriptForScoring { get; set; }
}

/// <summary>
/// DTO yêu cầu lưu và xuất bản kịch bản sau khi xem trước (Save & Publish Flow).
/// </summary>
public class SaveScriptRequest
{
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    public string? OriginalContent { get; set; }
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;
    public int? ModuleId { get; set; }
    public int? ChapterId { get; set; }
    public int? BackgroundMusicId { get; set; }
    public int? CourseId { get; set; }
    public decimal PassingScore { get; set; } = 80.00m;
    public DateTime? DueAt { get; set; }
    public bool? IsRemedial { get; set; }
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();

    /// <summary>
    /// Danh sách tiêu chí chấm điểm (Rubric) tùy chọn.
    /// </summary>
    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }
}

/// <summary>
/// DTO yêu cầu tạo mới trực tiếp một kịch bản luyện nói trong khóa học.
/// </summary>
public class CreateSpeakingScriptRequest
{
    [Required(ErrorMessage = "Khóa học là bắt buộc.")]
    public int CourseId { get; set; }
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
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();

    /// <summary>
    /// Danh sách tiêu chí chấm điểm (Rubric) tùy chọn.
    /// </summary>
    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }
}

/// <summary>
/// DTO yêu cầu cập nhật thông tin kịch bản luyện nói (Partial Update Pattern).
/// Mọi trường đều cho phép null, chỉ cập nhật những trường mà Client gửi giá trị lên.
/// </summary>
public class UpdateSpeakingScriptRequest
{
    public int? CourseId { get; set; }
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
    public List<SaveLevelDto>? Levels { get; set; }

    /// <summary>
    /// Danh sách cập nhật tiêu chí chấm điểm (Rubric).
    /// </summary>
    public List<SaveRubricCriterionDto>? RubricCriteria { get; set; }
}

/// <summary>
/// DTO yêu cầu chỉnh sửa riêng lẻ nội dung của một cấp độ luyện nói (ví dụ chỉ sửa lại cấp độ Advanced).
/// </summary>
public class UpdateLevelContentRequest
{
    [Required(ErrorMessage = "Nội dung cấp độ không được để trống.")]
    public string Content { get; set; } = string.Empty;
    public string? CleanScriptForScoring { get; set; }
}

/// <summary>
/// DTO hiển thị thông tin chi tiết một cấp độ kịch bản trả về cho Client.
/// </summary>
public class SpeakingScriptLevelDto
{
    public int LevelId { get; set; }
    public int ScriptId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? CleanScriptForScoring { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO hiển thị đầy đủ thông tin một kịch bản luyện nói kèm toàn bộ danh sách các cấp độ con.
/// </summary>
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
    public DateTime UpdatedAt { get; set; }
    public List<SpeakingScriptLevelDto> Levels { get; set; } = new();
    public List<SpeakingRubricCriterionDto> RubricCriteria { get; set; } = new();
}

/// <summary>
/// DTO chứa thông tin tiêu chí chấm điểm gửi lên khi tạo/cập nhật kịch bản nói.
/// </summary>
public class SaveRubricCriterionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public bool IsMandatory { get; set; } = false;
    public int OrderIndex { get; set; } = 0;
}

/// <summary>
/// DTO trả về chi tiết tiêu chí chấm điểm của bài tập nói.
/// </summary>
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
