// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Business Logic Layer - Speaking Scripts).
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Định nghĩa toàn bộ nghiệp vụ quản trị kịch bản luyện nói (Speaking Script Management).
//   Xử lý bóc tách file tự động, quản lý cấu trúc kịch bản 3 cấp độ (Beginner, Intermediate, Advanced)
//   và mở rộng theo 3 phạm vi (LESSON, CHAPTER, FINAL).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Giúp giảng viên tiết kiệm thời gian soạn bài bằng cách upload file Word/Text/PDF, hệ thống tự động
//   bóc tách nội dung, loại bỏ chỉ dẫn sân khấu tạo Clean Script phục vụ AI Speech Evaluation.
// - Cung cấp đầy đủ các thao tác xem trước (Preview), lưu chính thức (Save & Publish), cập nhật từng cấp độ,
//   hoặc quản lý toàn diện danh mục kịch bản của khóa học.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: SpeakingScriptController.
// - Triển khai: SpeakingScriptService.
// - Hợp tác dịch vụ: SpeakingScriptParserService (chuyên trách bóc tách text từ file),
//   ISpeakingScriptRepository, ICourseAccessControlService.
// ====================================================================================================

using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ quản lý kịch bản luyện nói và bóc tách tài liệu.
/// [Giải phẫu cú pháp]:
/// - `public`: Công khai toàn hệ thống.
/// - `interface`: Hợp đồng dịch vụ kịch bản nói.
/// - `ISpeakingScriptService`: Tên interface chuẩn C#.
/// </summary>
public interface ISpeakingScriptService
{
    /// <summary>
    /// [Dòng này làm gì]: Bóc tách trực tiếp file kịch bản thành các cấp độ mà không cần gắn trước vào bài học hay kiểm tra khóa học.
    /// Dùng cho công cụ tiện ích xem trước nhanh trên giao diện quản trị.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `IFormFile file`: File tài liệu Word (.docx), văn bản thuần (.txt) hoặc Markdown (.md).
    /// - `Task<ParsePreviewDto>`: DTO chứa kết quả phân tích và nội dung 3 cấp độ.
    /// </summary>
    /// <param name="file">File kịch bản tải lên.</param>
    /// <returns>ParsePreviewDto chứa các cấp độ đã bóc tách.</returns>
    Task<ParsePreviewDto> ParseFileDirectAsync(IFormFile file);

    /// <summary>
    /// [Dòng này làm gì]: Bóc tách file kịch bản cho một bài học cụ thể, có kiểm tra quyền sở hữu của giảng viên đối với bài học đó.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học.
    /// - `IFormFile file`: File tài liệu.
    /// - `int instructorId`: ID giảng viên thực hiện (lấy từ JWT Claims).
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="file">File kịch bản tải lên.</param>
    /// <param name="instructorId">ID giảng viên thực hiện.</param>
    /// <returns>ParsePreviewDto xem trước cấu trúc kịch bản.</returns>
    Task<ParsePreviewDto> ParseScriptFileAsync(int lessonId, IFormFile file, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Lưu chính thức và xuất bản kịch bản luyện nói cho một bài học sau khi giảng viên đã xem trước và chỉnh sửa.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học cần gắn kịch bản.
    /// - `SaveScriptRequest request`: DTO chứa Title, OriginalContent, PassingScore và danh sách nội dung 3 cấp độ.
    /// - `int instructorId`: ID giảng viên để kiểm tra quyền.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Dữ liệu kịch bản và 3 cấp độ cần lưu.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>SpeakingScriptDto đã được lưu thành công.</returns>
    Task<SpeakingScriptDto> SaveAndPublishAsync(int lessonId, SaveScriptRequest request, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy thông tin kịch bản luyện nói gắn liền với một bài học cụ thể (kèm các cấp độ).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học.
    /// - `Task<SpeakingScriptDto?>`: DTO kịch bản hoặc null nếu bài học không có kịch bản.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>SpeakingScriptDto hoặc null nếu bài học không có kịch bản nói.</returns>
    Task<SpeakingScriptDto?> GetScriptByLessonAsync(int lessonId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy nội dung chi tiết của một cấp độ luyện nói cụ thể trong bài học (học viên dùng khi bắt đầu luyện tập).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học.
    /// - `SpeakingLevel level`: Enum cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).
    /// - `Task<SpeakingScriptLevelDto?>`: DTO chứa nội dung hiển thị và CleanScriptForScoring.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>SpeakingScriptLevelDto hoặc null.</returns>
    Task<SpeakingScriptLevelDto?> GetLevelContentAsync(int lessonId, SpeakingLevel level);

    /// <summary>
    /// [Dòng này làm gì]: Cập nhật riêng lẻ nội dung hoặc kịch bản sạch của một cấp độ cụ thể trong kịch bản.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int scriptId`: ID kịch bản cha.
    /// - `SpeakingLevel level`: Cấp độ cần sửa.
    /// - `UpdateLevelContentRequest request`: DTO chứa Content và CleanScriptForScoring mới.
    /// - `int instructorId`: ID giảng viên.
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ cần sửa.</param>
    /// <param name="request">Nội dung cập nhật mới.</param>
    /// <param name="instructorId">ID giảng viên thực hiện.</param>
    /// <returns>SpeakingScriptDto hoàn chỉnh sau khi cập nhật.</returns>
    Task<SpeakingScriptDto?> UpdateLevelContentAsync(int scriptId, SpeakingLevel level, UpdateLevelContentRequest request, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Xóa kịch bản nói gắn với một bài học cụ thể.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học.
    /// - `int instructorId`: ID giảng viên.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>True nếu xóa thành công.</returns>
    Task<bool> DeleteScriptAsync(int lessonId, int instructorId);

    // ====================================================================================================
    // CÁC PHƯƠNG THỨC MỞ RỘNG CHO HỆ THỐNG KỊCH BẢN 3 CẤP ĐỘ PHẠM VI (LESSON, CHAPTER, FINAL)
    // ====================================================================================================

    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ danh sách kịch bản trong hệ thống hỗ trợ lọc đa tiêu chí (Khóa học, Scope, Module, Lesson, Search).
    /// </summary>
    Task<IEnumerable<SpeakingScriptDto>> GetAllScriptsAsync(int? courseId, SpeakingScope? scope, int? moduleId, int? lessonId, string? search);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết kịch bản nói theo mã định danh duy nhất (ScriptId).
    /// </summary>
    Task<SpeakingScriptDto?> GetScriptByIdAsync(int scriptId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách toàn bộ kịch bản thuộc về một khóa học cụ thể.
    /// </summary>
    Task<IEnumerable<SpeakingScriptDto>> GetScriptsByCourseAsync(int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Tạo mới một kịch bản luyện nói độc lập (hỗ trợ cả Scope = CHAPTER và Scope = FINAL).
    /// </summary>
    Task<SpeakingScriptDto> CreateScriptAsync(CreateSpeakingScriptRequest request, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Cập nhật thông tin kịch bản luyện nói theo ScriptId.
    /// </summary>
    Task<SpeakingScriptDto> UpdateScriptAsync(int scriptId, UpdateSpeakingScriptRequest request, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Xóa kịch bản luyện nói theo ScriptId và toàn bộ các cấp độ liên quan.
    /// </summary>
    Task<bool> DeleteScriptByIdAsync(int scriptId, int instructorId);
}
