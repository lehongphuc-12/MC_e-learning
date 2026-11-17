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
/// [Định nghĩa Interface]: Giao diện định nghĩa các phương thức truy xuất dữ liệu nâng cao cho Kịch bản luyện nói (SpeakingScript).
/// [Giải phẫu cú pháp]:
/// - `public`: Phạm vi truy cập công khai trong toàn bộ solution.
/// - `interface`: Từ khóa khai báo hợp đồng hành vi, chỉ chứa chữ ký phương thức không chứa thân hàm thực thi.
/// - `ISpeakingScriptRepository`: Tên interface tuân thủ quy ước tiền tố 'I' chuẩn C#.
/// - `: IGenericRepository<SpeakingScript>`: Kế thừa giao diện Generic Repository cơ sở, tự động thừa hưởng
///   toàn bộ phương thức CRUD chuẩn (GetByIdAsync, AddAsync, Update, Remove, FindAsync) cho thực thể SpeakingScript
///   mà không phải viết lại code lặp thừa (nguyên lý DRY).
/// </summary>
public interface ISpeakingScriptRepository : IGenericRepository<SpeakingScript>
{
    /// <summary>
    /// [Dòng này làm gì]: Lấy kịch bản luyện nói gắn liền với một bài học cụ thể, kèm theo toàn bộ thông tin quan hệ (Course, Module, Lesson, Levels).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<SpeakingScript?>`: Kiểu trả về bất đồng bộ trong TAP (Task-based Asynchronous Pattern).
    ///   `SpeakingScript?` là Nullable Reference Type, có thể trả về một đối tượng kịch bản hoặc `null` nếu bài học đó không có kịch bản nói.
    /// - `GetByLessonIdAsync`: Tên hàm theo quy tắc đặt tên có hậu tố 'Async'.
    /// - `int lessonId`: Khóa ngoại trỏ đến bảng Lessons.
    /// [Tại sao dùng & Rủi ro nếu thiếu]:
    /// - Giúp tầng Service lấy được kịch bản bài học kèm toàn bộ 3 cấp độ (Levels) trong 1 query duy nhất, tránh lỗi N+1 query.
    /// </summary>
    /// <param name="lessonId">ID bài học cần tra cứu.</param>
    /// <returns>Thực thể SpeakingScript nếu tìm thấy; ngược lại trả về null.</returns>
    Task<SpeakingScript?> GetByLessonIdAsync(int lessonId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết một kịch bản theo ID kịch bản (scriptId), nạp sẵn các bảng liên quan (Course, Module, Lesson, CreatedByUser, Levels).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<SpeakingScript?>`: Trả về Task chứa kịch bản hoặc null bất đồng bộ.
    /// - `int scriptId`: Khóa chính (Primary Key) của bảng SpeakingScripts.
    /// [Tại sao dùng]: Phục vụ các kịch bản độc lập ở cấp độ CHAPTER hoặc FINAL vốn không liên kết trực tiếp với bài học nào.
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Thực thể SpeakingScript đầy đủ dữ liệu hoặc null.</returns>
    Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ danh sách kịch bản thuộc về một khóa học (bao gồm kịch bản gán thẳng vào Course hoặc thông qua Lesson của Course).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<IEnumerable<SpeakingScript>>`: Trả về tập hợp danh sách các kịch bản theo chuẩn chỉ đọc IEnumerable.
    /// - `int courseId`: Khóa ngoại xác định khóa học cần lọc.
    /// [Tại sao dùng]: Giúp Giảng viên xem toàn bộ ngân hàng kịch bản của khóa học trên trang quản trị.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách kịch bản luyện nói của khóa học.</returns>
    Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Tìm kiếm và lọc danh sách kịch bản nói linh hoạt theo nhiều tiêu chí (CourseId, Scope, ModuleId, LessonId, từ khóa search).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int? courseId`: Nullable int, cho phép lọc theo khóa học hoặc bỏ qua.
    /// - `SpeakingScope? scope`: Nullable enum (LESSON, CHAPTER, FINAL), cho phép lọc theo phạm vi đánh giá.
    /// - `int? moduleId`: Nullable int lọc theo chương học.
    /// - `int? lessonId`: Nullable int lọc theo bài học.
    /// - `string? search`: Chuỗi từ khóa tìm kiếm (nullable string).
    /// [Tại sao dùng]: Cung cấp khả năng lọc động (Dynamic Querying) hiệu quả, tối ưu hóa câu lệnh SQL tại Database thay vì kéo toàn bộ dữ liệu về RAM rồi mới lọc.
    /// </summary>
    /// <param name="courseId">Lọc theo khóa học (tùy chọn).</param>
    /// <param name="scope">Lọc theo phạm vi LESSON/CHAPTER/FINAL (tùy chọn).</param>
    /// <param name="moduleId">Lọc theo chương học (tùy chọn).</param>
    /// <param name="lessonId">Lọc theo bài học (tùy chọn).</param>
    /// <param name="search">Từ khóa tìm kiếm theo Tiêu đề, Tên khóa học hoặc Nội dung kịch bản gốc.</param>
    /// <returns>Danh sách kịch bản thỏa mãn bộ lọc.</returns>
    Task<IEnumerable<SpeakingScript>> GetAllWithDetailsAsync(int? courseId, SpeakingScope? scope, int? moduleId, int? lessonId, string? search);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết nội dung của một cấp độ luyện nói cụ thể theo ID kịch bản và Cấp độ.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<SpeakingScriptLevel?>`: Trả về thực thể cấp độ kịch bản (SpeakingScriptLevel) hoặc null nếu không tồn tại.
    /// - `int scriptId`: ID kịch bản cha.
    /// - `SpeakingLevel level`: Enum cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null nếu không tồn tại.</returns>
    Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết nội dung của một cấp độ luyện nói thông qua ID bài học và Cấp độ.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<SpeakingScriptLevel?>`: Trả về thực thể cấp độ kịch bản hoặc null.
    /// - `int lessonId`: ID bài học.
    /// - `SpeakingLevel level`: Cấp độ học viên chọn trên giao diện luyện tập.
    /// [Tại sao dùng]: Giúp Client của học viên chỉ cần truyền LessonId và Level đã chọn là lấy được ngay nội dung luyện tập mà không cần biết ScriptId ngầm bên dưới.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ cần lấy.</param>
    /// <returns>Thực thể SpeakingScriptLevel tương ứng.</returns>
    Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level);
}
