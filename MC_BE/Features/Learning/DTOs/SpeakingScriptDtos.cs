// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / Feature-based).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa tất cả các hợp đồng dữ liệu (Data Contracts) liên quan đến quản lý, phân tích
//   (parse) và lưu trữ Kịch bản luyện nói (Speaking Scripts) đa cấp độ (Beginner, Intermediate, Advanced).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cho phép Giảng viên tải lên file kịch bản (.txt, .docx, .pdf), hệ thống tự động bóc tách (parse)
//   ra 3 cấp độ nói kèm kịch bản sạch loại bỏ hướng dẫn sân khấu để chấm điểm AI/Speech-to-Text.
// - Quản lý kịch bản luyện nói ở 3 phạm vi (SpeakingScope):
//   1. LESSON: Bài tập nói trong một bài học cụ thể.
//   2. CHAPTER: Bài tập nói kiểm tra cuối chương (Module).
//   3. FINAL: Bài thi tốt nghiệp nói cuối khóa học.
// - Cấu hình điểm qua môn (PassingScore - mặc định 80.00 điểm).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client: Gửi file kịch bản hoặc JSON cấu hình kịch bản tới SpeakingScriptController.
// - Controller: Điều hướng tới SpeakingScriptService & SpeakingScriptParserService.
// - Database: Bảng SpeakingScripts và SpeakingScriptLevels (1-nhiều).
// ====================================================================================================

using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa file kịch bản đính kèm do giảng viên gửi lên để hệ thống phân tích tự động.
/// </summary>
public class ParseScriptFileRequest
{
    /// <summary>
    /// File văn bản chứa nội dung kịch bản (.txt, .docx, .doc, .pdf). Bắt buộc cung cấp.
    /// </summary>
    [Required(ErrorMessage = "Tập tin kịch bản là bắt buộc.")]
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// DTO mô tả nội dung xem trước của một cấp độ luyện nói cụ thể sau khi bóc tách từ file.
/// </summary>
public class LevelPreviewDto
{
    /// <summary>
    /// Cấp độ nói: BEGINNER, INTERMEDIATE, hoặc ADVANCED.
    /// </summary>
    public SpeakingLevel Level { get; set; }

    /// <summary>
    /// Toàn bộ nội dung kịch bản gốc kèm theo các hướng dẫn biểu cảm/cử chỉ sân khấu: [Cười tươi], (Ngắt giọng 2s)...
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Kịch bản tinh gọn đã loại bỏ toàn bộ chỉ dẫn đạo diễn trong ngoặc [], (), chỉ giữ lại lời thoại thuần túy
    /// để cấp cho thuật toán so khớp văn bản (Speech-to-Text / Levenshtein Distance) khi chấm điểm.
    /// </summary>
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

/// <summary>
/// DTO trả về kết quả xem trước sau khi bóc tách file kịch bản (Preview Parsing Result).
/// Giúp giảng viên rà soát lỗi cú pháp trước khi chính thức lưu vào CSDL.
/// </summary>
public class ParsePreviewDto
{
    /// <summary>
    /// Cờ báo hiệu quá trình phân tích file có thành công và đủ điều kiện hay không.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Danh sách các thông báo lỗi nếu phân tích thất bại (ví dụ: thiếu thẻ [BEGINNER], file không đúng định dạng...).
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Toàn bộ chuỗi văn bản thô đọc ra từ file ban đầu.
    /// </summary>
    public string OriginalContent { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách các cấp độ đã bóc tách thành công (thông thường đủ 3 cấp độ: Cơ bản, Trung cấp, Nâng cao).
    /// </summary>
    public List<LevelPreviewDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO chứa thông tin nội dung của một cấp độ khi thực hiện lưu hoặc cập nhật kịch bản.
/// </summary>
public class SaveLevelDto
{
    /// <summary>
    /// Cấp độ nói tương ứng (BEGINNER, INTERMEDIATE, ADVANCED).
    /// </summary>
    [Required]
    public SpeakingLevel Level { get; set; }

    /// <summary>
    /// Nội dung kịch bản đầy đủ của cấp độ này.
    /// </summary>
    [Required]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Kịch bản tinh gọn phục vụ chấm điểm tự động. Nếu null, hệ thống sẽ tự sinh từ Content.
    /// </summary>
    public string? CleanScriptForScoring { get; set; }
}

/// <summary>
/// DTO yêu cầu lưu và xuất bản kịch bản sau khi xem trước (Save & Publish Flow).
/// </summary>
public class SaveScriptRequest
{
    /// <summary>
    /// Tiêu đề kịch bản luyện nói (tối đa 500 ký tự).
    /// </summary>
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Nội dung gốc đầy đủ được lưu lại làm tài liệu lưu trữ/đối chiếu.
    /// </summary>
    public string? OriginalContent { get; set; }

    /// <summary>
    /// Phạm vi đánh giá của bài nói (LESSON, CHAPTER, FINAL). Mặc định là FINAL.
    /// </summary>
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    /// <summary>
    /// ID chương học (áp dụng nếu Scope = CHAPTER).
    /// </summary>
    public int? ModuleId { get; set; }

    /// <summary>
    /// ID khóa học liên kết.
    /// </summary>
    public int? CourseId { get; set; }

    /// <summary>
    /// Điểm số tối thiểu để vượt qua bài nói (mặc định 80.00 trên thang 100).
    /// </summary>
    public decimal PassingScore { get; set; } = 80.00m;

    /// <summary>
    /// Danh sách nội dung 3 cấp độ, bắt buộc phải có ít nhất 3 phần tử (BEGINNER, INTERMEDIATE, ADVANCED).
    /// </summary>
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO yêu cầu tạo mới trực tiếp một kịch bản luyện nói trong khóa học.
/// </summary>
public class CreateSpeakingScriptRequest
{
    /// <summary>
    /// ID khóa học sở hữu kịch bản.
    /// </summary>
    [Required(ErrorMessage = "Khóa học là bắt buộc.")]
    public int CourseId { get; set; }

    /// <summary>
    /// Phạm vi kịch bản (LESSON: Bài học, CHAPTER: Cuối chương, FINAL: Cuối khóa).
    /// </summary>
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    /// <summary>
    /// ID của chương học liên kết (bắt buộc nếu Scope = CHAPTER).
    /// </summary>
    public int? ModuleId { get; set; }

    /// <summary>
    /// ID của bài học liên kết (bắt buộc nếu Scope = LESSON).
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// Tên kịch bản luyện nói.
    /// </summary>
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Nội dung gốc (nếu có).
    /// </summary>
    public string? OriginalContent { get; set; }

    /// <summary>
    /// Ngưỡng điểm đạt (mặc định 80.00).
    /// </summary>
    public decimal PassingScore { get; set; } = 80.00m;

    /// <summary>
    /// Danh sách nội dung 3 cấp độ bắt buộc.
    /// </summary>
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO yêu cầu cập nhật thông tin kịch bản luyện nói.
/// Các trường đều cho phép null, chỉ cập nhật những trường có giá trị truyền vào (Partial Update).
/// </summary>
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

/// <summary>
/// DTO yêu cầu chỉnh sửa riêng lẻ nội dung của một cấp độ luyện nói (ví dụ chỉ sửa lại cấp độ Advanced).
/// </summary>
public class UpdateLevelContentRequest
{
    /// <summary>
    /// Nội dung kịch bản mới cho cấp độ.
    /// </summary>
    [Required(ErrorMessage = "Nội dung cấp độ không được để trống.")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Kịch bản sạch tinh chỉnh riêng nếu có.
    /// </summary>
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
