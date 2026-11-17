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
    // [Dòng này làm gì]: Ràng buộc bắt buộc giảng viên phải chọn tập tin kịch bản khi gửi yêu cầu bóc tách.
    // [Giải phẫu từng từ khóa]: `[Required(ErrorMessage = "...")]` - DataAnnotation kiểm tra giá trị null.
    [Required(ErrorMessage = "Tập tin kịch bản là bắt buộc.")]
    // [Dòng này làm gì]: Khai báo thuộc tính nhận file nhị phân văn bản tải lên (.docx, .txt, .md).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Công khai ra bên ngoài.
    //   - `IFormFile`: Giao diện đại diện file upload trong ASP.NET Core Http.
    //   - `File`: Tên trường form data.
    //   - `{ get; set; }`: Cặp getter/setter tự động.
    //   - `= null!;`: Toán tử Null-forgiving Operator triệt tiêu cảnh báo CS8618.
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// DTO mô tả nội dung xem trước của một cấp độ luyện nói cụ thể sau khi bóc tách từ file.
/// </summary>
public class LevelPreviewDto
{
    // [Dòng này làm gì]: Lưu cấp độ nói tương ứng (BEGINNER, INTERMEDIATE, ADVANCED).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Bộc lộ thuộc tính công khai.
    //   - `SpeakingLevel`: Kiểu liệt kê Enum (System.Enum) định nghĩa trong MC_BE.Core.Enums, gồm 3 giá trị hằng số: BEGINNER (0), INTERMEDIATE (1), ADVANCED (2).
    //   - `Level`: Tên định danh thuộc tính.
    //   - `{ get; set; }`: Getter/Setter.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Sử dụng Enum đảm bảo an toàn kiểu dữ liệu (Type Safety) trong lúc compile-time, ngăn chặn việc truyền các giá trị cấp độ tùy tiện không tồn tại.
    public SpeakingLevel Level { get; set; }

    // [Dòng này làm gì]: Lưu nội dung kịch bản gốc kèm theo các thẻ chỉ dẫn cử chỉ, biểu cảm và ngắt nghỉ.
    // [Giải phẫu từng từ khóa]: `public string Content { get; set; } = string.Empty;`
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu kịch bản tinh gọn đã loại bỏ toàn bộ chỉ dẫn đạo diễn trong ngoặc vuông `[...]` phục vụ so khớp Speech-to-Text.
    // [Giải phẫu từng từ khóa]: `public string CleanScriptForScoring { get; set; } = string.Empty;`
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

/// <summary>
/// DTO trả về kết quả xem trước sau khi bóc tách file kịch bản (Preview Parsing Result).
/// Giúp giảng viên rà soát lỗi cú pháp trước khi chính thức lưu vào CSDL.
/// </summary>
public class ParsePreviewDto
{
    // [Dòng này làm gì]: Cờ báo hiệu quá trình phân tích file có thành công và trích xuất đủ cấp độ hay không.
    // [Giải phẫu từng từ khóa]: `public bool Success { get; set; }` - Kiểu boolean (true/false).
    public bool Success { get; set; }

    // [Dòng này làm gì]: Danh sách các thông báo lỗi nếu quá trình bóc tách thất bại (ví dụ: file rỗng, sai định dạng, thiếu thẻ).
    // [Giải phẫu từng từ khóa]:
    //   - `public List<string> Errors { get; set; } = new();`: Khởi tạo sẵn một danh sách rỗng để không bao giờ bị null pointer.
    public List<string> Errors { get; set; } = new();

    // [Dòng này làm gì]: Lưu toàn bộ văn bản thô đọc ra từ tập tin tải lên ban đầu.
    // [Giải phẫu từng từ khóa]: `public string OriginalContent { get; set; } = string.Empty;`
    public string OriginalContent { get; set; } = string.Empty;

    // [Dòng này làm gì]: Danh sách các cấp độ đã bóc tách thành công (thông thường đủ cả 3 cấp độ: Cơ bản, Trung cấp, Nâng cao).
    // [Giải phẫu từng từ khóa]:
    //   - `public List<LevelPreviewDto> Levels { get; set; } = new();`: Mảng danh sách LevelPreviewDto được khởi tạo sẵn instance rỗng.
    public List<LevelPreviewDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO chứa thông tin nội dung của một cấp độ khi thực hiện lưu hoặc cập nhật kịch bản.
/// </summary>
public class SaveLevelDto
{
    // [Dòng này làm gì]: Ràng buộc bắt buộc phải chọn cấp độ.
    [Required]
    // [Dòng này làm gì]: Lưu cấp độ tương ứng.
    public SpeakingLevel Level { get; set; }

    // [Dòng này làm gì]: Ràng buộc bắt buộc nội dung kịch bản của cấp độ không được để trống.
    [Required]
    // [Dòng này làm gì]: Lưu nội dung văn bản kịch bản cho cấp độ đó.
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu kịch bản sạch tùy chỉnh nếu giảng viên muốn tinh chỉnh riêng; nếu null hệ thống sẽ tự sinh từ Content.
    // [Giải phẫu từng từ khóa]: `public string? CleanScriptForScoring { get; set; }` - Cho phép null (`string?`).
    public string? CleanScriptForScoring { get; set; }
}

/// <summary>
/// DTO yêu cầu lưu và xuất bản kịch bản sau khi xem trước (Save & Publish Flow).
/// </summary>
public class SaveScriptRequest
{
    // [Dòng này làm gì]: Ràng buộc tiêu đề kịch bản không được rỗng.
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    // [Dòng này làm gì]: Giới hạn độ dài tiêu đề tối đa 500 ký tự.
    [MaxLength(500)]
    // [Dòng này làm gì]: Lưu tên tiêu đề kịch bản luyện nói.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu nội dung gốc lưu trữ đối chiếu.
    public string? OriginalContent { get; set; }

    // [Dòng này làm gì]: Khai báo phạm vi đánh giá của bài nói (LESSON, CHAPTER, FINAL). Mặc định là FINAL.
    // [Giải phẫu từng từ khóa]:
    //   - `public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;`: Kiểu Enum SpeakingScope, gán giá trị mặc định lúc khởi tạo là FINAL.
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    // [Dòng này làm gì]: Khóa ngoại ID chương học (áp dụng nếu Scope = CHAPTER).
    // [Giải phẫu từng từ khóa]: `public int? ModuleId { get; set; }` - Nullable integer.
    public int? ModuleId { get; set; }

    // [Dòng này làm gì]: Khóa ngoại ID khóa học liên kết.
    // [Giải phẫu từng từ khóa]: `public int? CourseId { get; set; }` - Nullable integer.
    public int? CourseId { get; set; }

    // [Dòng này làm gì]: Ngưỡng điểm đạt chuẩn đầu ra của bài tập nói (mặc định 80.00 điểm trên thang 100).
    // [Giải phẫu từng từ khóa]:
    //   - `public decimal PassingScore { get; set; } = 80.00m;`: Kiểu số thực chính xác cao decimal (hậu tố `m`), khởi tạo giá trị mặc định là 80.00m.
    public decimal PassingScore { get; set; } = 80.00m;

    // [Dòng này làm gì]: Ràng buộc bắt buộc phải có mảng nội dung các cấp độ.
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    // [Dòng này làm gì]: Ràng buộc bắt buộc mảng phải có tối thiểu 3 phần tử (đại diện cho BEGINNER, INTERMEDIATE, ADVANCED).
    // [Giải phẫu từng từ khóa]:
    //   - `[MinLength(3, ErrorMessage = "...")]`: DataAnnotation kiểm tra số lượng phần tử tối thiểu của tập hợp.
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    // [Dòng này làm gì]: Lưu danh sách nội dung 3 cấp độ.
    public List<SaveLevelDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO yêu cầu tạo mới trực tiếp một kịch bản luyện nói trong khóa học.
/// </summary>
public class CreateSpeakingScriptRequest
{
    // [Dòng này làm gì]: Ràng buộc khóa học là bắt buộc phải có.
    [Required(ErrorMessage = "Khóa học là bắt buộc.")]
    // [Dòng này làm gì]: Khóa ngoại ID khóa học sở hữu bài tập nói.
    public int CourseId { get; set; }

    // [Dòng này làm gì]: Phạm vi đánh giá (LESSON, CHAPTER, FINAL). Mặc định FINAL.
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    // [Dòng này làm gì]: ID chương học (bắt buộc nếu Scope = CHAPTER).
    public int? ModuleId { get; set; }

    // [Dòng này làm gì]: ID bài học (bắt buộc nếu Scope = LESSON).
    public int? LessonId { get; set; }

    // [Dòng này làm gì]: Ràng buộc bắt buộc tiêu đề kịch bản không được rỗng.
    [Required(ErrorMessage = "Tiêu đề kịch bản không được để trống.")]
    // [Dòng này làm gì]: Giới hạn tối đa 500 ký tự.
    [MaxLength(500)]
    // [Dòng này làm gì]: Tên bài tập nói.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Nội dung gốc (nếu có).
    public string? OriginalContent { get; set; }

    // [Dòng này làm gì]: Điểm số qua môn (mặc định 80.00).
    public decimal PassingScore { get; set; } = 80.00m;

    // [Dòng này làm gì]: Ràng buộc bắt buộc có đủ 3 cấp độ.
    [Required(ErrorMessage = "Phải cung cấp đủ nội dung các cấp độ.")]
    [MinLength(3, ErrorMessage = "Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).")]
    public List<SaveLevelDto> Levels { get; set; } = new();
}

/// <summary>
/// DTO yêu cầu cập nhật thông tin kịch bản luyện nói (Partial Update Pattern).
/// Mọi trường đều cho phép null, chỉ cập nhật những trường mà Client gửi giá trị lên.
/// </summary>
public class UpdateSpeakingScriptRequest
{
    // [Dòng này làm gì]: ID khóa học mới nếu muốn chuyển khóa học.
    public int? CourseId { get; set; }

    // [Dòng này làm gì]: Phạm vi Scope mới nếu muốn thay đổi cấp độ đánh giá.
    public SpeakingScope? Scope { get; set; }

    // [Dòng này làm gì]: ID chương học mới.
    public int? ModuleId { get; set; }

    // [Dòng này làm gì]: ID bài học mới.
    public int? LessonId { get; set; }

    // [Dòng này làm gì]: Tiêu đề mới (giới hạn tối đa 500 ký tự).
    [MaxLength(500)]
    public string? Title { get; set; }

    // [Dòng này làm gì]: Nội dung gốc cập nhật.
    public string? OriginalContent { get; set; }

    // [Dòng này làm gì]: Ngưỡng điểm đạt mới.
    public decimal? PassingScore { get; set; }

    // [Dòng này làm gì]: Danh sách cập nhật các cấp độ con.
    public List<SaveLevelDto>? Levels { get; set; }
}

/// <summary>
/// DTO yêu cầu chỉnh sửa riêng lẻ nội dung của một cấp độ luyện nói (ví dụ chỉ sửa lại cấp độ Advanced).
/// </summary>
public class UpdateLevelContentRequest
{
    // [Dòng này làm gì]: Ràng buộc nội dung không được để trống.
    [Required(ErrorMessage = "Nội dung cấp độ không được để trống.")]
    // [Dòng này làm gì]: Lưu nội dung văn bản kịch bản mới cho cấp độ.
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu kịch bản sạch tùy chỉnh (nếu có).
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
