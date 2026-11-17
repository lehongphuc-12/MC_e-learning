// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Repository Interface (Hợp đồng tầng lưu trữ) trong Repository Pattern.
// - Nằm trong module: Features/Learning/Repositories/Interfaces.
// - Kế thừa từ: IGenericRepository<SpeakingScript> cung cấp các thao tác CRUD cơ bản.
// - Vai trò: Trừu tượng hóa các phương thức truy xuất dữ liệu chuyên biệt cho thực thể SpeakingScript
//   và SpeakingScriptLevel, giúp Service không phụ thuộc trực tiếp vào EF Core DbContext.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp các câu truy vấn phức tạp kết hợp Eager Loading (Include Course, Module, Lesson, Levels)
//   để lấy kịch bản luyện nói theo nhiều chiều: theo bài học (LessonId), theo khóa học (CourseId),
//   hoặc tìm kiếm/lọc tổng hợp theo Scope/Từ khóa.
// - Truy xuất chính xác nội dung theo từng cấp độ luyện nói (Beginner, Intermediate, Advanced).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Được triển khai (Implement) bởi: SpeakingScriptRepository.
// - Được inject vào: SpeakingScriptService, SpeakingSubmissionService, LearningAccessService.
// - Dữ liệu trả về: Thực thể SpeakingScript và SpeakingScriptLevel.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

/// <summary>
/// Giao diện định nghĩa các phương thức truy xuất dữ liệu nâng cao cho Kịch bản luyện nói (SpeakingScript).
/// Kế thừa toàn bộ năng lực CRUD chuẩn từ IGenericRepository.
/// </summary>
public interface ISpeakingScriptRepository : IGenericRepository<SpeakingScript>
{
    /// <summary>
    /// Lấy kịch bản luyện nói gắn liền với một bài học cụ thể, kèm theo toàn bộ thông tin quan hệ (Course, Module, Lesson, Levels).
    /// </summary>
    /// <param name="lessonId">ID bài học cần tra cứu.</param>
    /// <returns>Thực thể SpeakingScript nếu tìm thấy; ngược lại trả về null.</returns>
    Task<SpeakingScript?> GetByLessonIdAsync(int lessonId);

    /// <summary>
    /// Lấy chi tiết một kịch bản theo ID kịch bản (scriptId), nạp sẵn các bảng liên quan (Course, Module, Lesson, CreatedByUser, Levels).
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Thực thể SpeakingScript đầy đủ dữ liệu hoặc null.</returns>
    Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId);

    /// <summary>
    /// Lấy toàn bộ danh sách kịch bản thuộc về một khóa học (bao gồm kịch bản gán thẳng vào Course hoặc thông qua Lesson của Course).
    /// Sắp xếp theo Scope (LESSON -> CHAPTER -> FINAL) và ScriptId tăng dần.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách kịch bản luyện nói của khóa học.</returns>
    Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId);

    /// <summary>
    /// Tìm kiếm và lọc danh sách kịch bản nói linh hoạt theo nhiều tiêu chí (CourseId, Scope, ModuleId, LessonId, từ khóa search).
    /// Sắp xếp theo ngày cập nhật mới nhất (UpdatedAt giảm dần).
    /// </summary>
    /// <param name="courseId">Lọc theo khóa học (tùy chọn).</param>
    /// <param name="scope">Lọc theo phạm vi LESSON/CHAPTER/FINAL (tùy chọn).</param>
    /// <param name="moduleId">Lọc theo chương học (tùy chọn).</param>
    /// <param name="lessonId">Lọc theo bài học (tùy chọn).</param>
    /// <param name="search">Từ khóa tìm kiếm theo Tiêu đề, Tên khóa học hoặc Nội dung kịch bản gốc.</param>
    /// <returns>Danh sách kịch bản thỏa mãn bộ lọc.</returns>
    Task<IEnumerable<SpeakingScript>> GetAllWithDetailsAsync(int? courseId, SpeakingScope? scope, int? moduleId, int? lessonId, string? search);

    /// <summary>
    /// Lấy chi tiết nội dung của một cấp độ luyện nói cụ thể theo ID kịch bản và Cấp độ.
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null nếu không tồn tại.</returns>
    Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level);

    /// <summary>
    /// Lấy chi tiết nội dung của một cấp độ luyện nói thông qua ID bài học và Cấp độ.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ cần lấy.</param>
    /// <returns>Thực thể SpeakingScriptLevel tương ứng.</returns>
    Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level);
}
