using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện định nghĩa các phương thức truy xuất dữ liệu nâng cao cho Kịch bản luyện nói (SpeakingScript).
///   toàn bộ phương thức CRUD chuẩn (GetByIdAsync, AddAsync, Update, Remove, FindAsync) cho thực thể SpeakingScript
///   mà không phải viết lại code lặp thừa (nguyên lý DRY).
/// </summary>
public interface ISpeakingScriptRepository : IGenericRepository<SpeakingScript>
{
    /// <summary>Lấy kịch bản luyện nói gắn liền với một bài học cụ thể, kèm theo toàn bộ thông tin quan hệ (Course, Module, Lesson, Levels).</summary>
    ///   `SpeakingScript?` là Nullable Reference Type, có thể trả về một đối tượng kịch bản hoặc `null` nếu bài học đó không có kịch bản nói.
    /// - `GetByLessonIdAsync`: Tên hàm theo quy tắc đặt tên có hậu tố 'Async'.
    /// - `int lessonId`: Khóa ngoại trỏ đến bảng Lessons.
    /// - Giúp tầng Service lấy được kịch bản bài học kèm toàn bộ 3 cấp độ (Levels) trong 1 query duy nhất, tránh lỗi N+1 query.
    /// </summary>
    /// <param name="lessonId">ID bài học cần tra cứu.</param>
    /// <returns>Thực thể SpeakingScript nếu tìm thấy; ngược lại trả về null.</returns>
    Task<SpeakingScript?> GetByLessonIdAsync(int lessonId);
    /// <summary>Lấy chi tiết một kịch bản theo ID kịch bản (scriptId), nạp sẵn các bảng liên quan (Course, Module, Lesson, CreatedByUser, Levels).</summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Thực thể SpeakingScript đầy đủ dữ liệu hoặc null.</returns>
    Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId);
    /// <summary>Lấy toàn bộ danh sách kịch bản thuộc về một khóa học (bao gồm kịch bản gán thẳng vào Course hoặc thông qua Lesson của Course).</summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách kịch bản luyện nói của khóa học.</returns>
    Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId);
    /// <summary>Tìm kiếm và lọc danh sách kịch bản nói linh hoạt theo nhiều tiêu chí (CourseId, Scope, ModuleId, LessonId, từ khóa search).</summary>
    /// <param name="courseId">Lọc theo khóa học (tùy chọn).</param>
    /// <param name="scope">Lọc theo phạm vi LESSON/CHAPTER/FINAL (tùy chọn).</param>
    /// <param name="moduleId">Lọc theo chương học (tùy chọn).</param>
    /// <param name="lessonId">Lọc theo bài học (tùy chọn).</param>
    /// <param name="search">Từ khóa tìm kiếm theo Tiêu đề, Tên khóa học hoặc Nội dung kịch bản gốc.</param>
    /// <returns>Danh sách kịch bản thỏa mãn bộ lọc.</returns>
    Task<IEnumerable<SpeakingScript>> GetAllWithDetailsAsync(int? courseId, SpeakingScope? scope, int? moduleId, int? lessonId, string? search);
    /// <summary>Lấy chi tiết nội dung của một cấp độ luyện nói cụ thể theo ID kịch bản và Cấp độ.</summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null nếu không tồn tại.</returns>
    Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level);
    /// <summary>Lấy chi tiết nội dung của một cấp độ luyện nói thông qua ID bài học và Cấp độ.</summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ cần lấy.</param>
    /// <returns>Thực thể SpeakingScriptLevel tương ứng.</returns>
    Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level);
}
