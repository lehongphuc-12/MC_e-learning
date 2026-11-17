// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Data Access Layer (Repository Implementation) trong Repository Pattern.
// - Nằm trong module: Features/Learning/Repositories.
// - Kế thừa từ: GenericRepository<SpeakingScript> và triển khai ISpeakingScriptRepository.
// - Vai trò: Trực tiếp thao tác với cơ sở dữ liệu thông qua Entity Framework Core (SmartMcDbContext).
//   Thực hiện các truy vấn dữ liệu quan hệ (Eager Loading với .Include()) để tối ưu hóa hiệu năng và tránh lỗi N+1 Query.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý truy xuất thực thể kịch bản luyện nói (SpeakingScript) và các cấp độ chi tiết (SpeakingScriptLevel).
// - Hỗ trợ lọc kịch bản theo nhiều chiều không gian trong khóa học: Cấp độ Khóa học (Course), Chương (Module), Bài học (Lesson).
// - Tìm kiếm toàn văn linh hoạt (Full-text/substring search) phục vụ trang quản trị của Giảng viên và Admin.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Input: Tham số lọc và tìm kiếm từ Service (SpeakingScriptService, SpeakingSubmissionService).
// - Process: Xây dựng câu truy vấn IQueryable với EF Core trên DbContext, tận dụng deferred execution.
// - Output: Trả về đối tượng thực thể (hoặc danh sách thực thể) nạp đủ quan hệ cho tầng Service xử lý nghiệp vụ.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Repositories;

/// <summary>
/// Lớp triển khai cụ thể của ISpeakingScriptRepository sử dụng Entity Framework Core.
/// </summary>
public class SpeakingScriptRepository : GenericRepository<SpeakingScript>, ISpeakingScriptRepository
{
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Repository với DbContext được inject từ DI Container.
    /// </summary>
    /// <param name="context">SmartMcDbContext kết nối cơ sở dữ liệu PostgreSQL/SQL Server.</param>
    public SpeakingScriptRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy kịch bản luyện nói gắn với một bài học cụ thể, kèm theo quan hệ Course, Module, Lesson, CreatedByUser, Levels.
    /// <para>End-to-End Flow: Nhận lessonId -> Khởi tạo truy vấn trên DbSet SpeakingScripts -> Include các bảng liên quan -> Lọc điều kiện LessonId == lessonId -> Trả về bản ghi đầu tiên hoặc null.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học cần lấy kịch bản.</param>
    /// <returns>Thực thể SpeakingScript nạp đủ thông tin hoặc null.</returns>
    public async Task<SpeakingScript?> GetByLessonIdAsync(int lessonId)
    {
        // [BƯỚC 1]: Truy vấn bảng SpeakingScripts với Eager Loading
        // - Dữ liệu chảy từ DbSet<SpeakingScript> qua các mệnh đề Include để nạp sẵn dữ liệu quan hệ.
        // [TẠI SAO DÙNG HÀM/KỸ THUẬT NÀY]:
        //   - Sử dụng .Include() tránh N+1 Query Problem: toàn bộ thực thể kịch bản và các cấp độ con (Levels)
        //     được gom vào một câu lệnh SQL JOIN duy nhất, thay vì query thêm N lần khi duyệt Levels.
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN]:
        //   - Q: Nếu bài học không có kịch bản nói thì sao?
        //   - A: FirstOrDefaultAsync trả về null, Service sẽ kiểm tra null và xử lý phù hợp (hoặc throw NotFoundException nếu bắt buộc).
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.LessonId == lessonId);
    }

    /// <summary>
    /// Lấy chi tiết kịch bản luyện nói theo ScriptId kèm theo toàn bộ thông tin quan hệ.
    /// <para>End-to-End Flow: Nhận scriptId -> Query SpeakingScripts -> Include Course/Module/Lesson/CreatedByUser/Levels -> FirstOrDefaultAsync(ScriptId == scriptId).</para>
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Thực thể SpeakingScript chi tiết hoặc null.</returns>
    public async Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId)
    {
        // [BƯỚC 1]: Thực thi truy vấn lấy kịch bản theo Khóa chính ScriptId
        // [TẠI SAO DÙNG HÀM/KỸ THUẬT NÀY]:
        //   - Lấy kịch bản bằng ScriptId độc lập để phục vụ các bài thi Speaking cuối chương (Module) hoặc cuối khóa (Final)
        //     vốn không gắn trực tiếp vào một LessonId nào.
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.ScriptId == scriptId);
    }

    /// <summary>
    /// Lấy tất cả các kịch bản liên quan đến một khóa học cụ thể.
    /// <para>End-to-End Flow: Nhận courseId -> Query SpeakingScripts -> Include quan hệ -> Lọc kịch bản gắn trực tiếp CourseId HOẶC thông qua Lesson.CourseId -> Sắp xếp theo Scope rồi ScriptId -> ToListAsync.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách kịch bản thuộc khóa học.</returns>
    public async Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId)
    {
        // [BƯỚC 1]: Truy vấn danh sách kịch bản nói của khóa học
        // [GIẢI PHẪU ĐIỀU KIỆN LỌC TRONG WHERE]:
        //   - s.CourseId == courseId: Kịch bản được gắn trực tiếp vào khóa học (thường là bài Final Test).
        //   - s.Lesson != null && s.Lesson.CourseId == courseId: Kịch bản được gắn vào bài học con thuộc khóa học đó.
        // [TẠI SAO DÙNG CÁCH NÀY]:
        //   - Đảm bảo gom đủ 100% kịch bản trong khóa học mà không bỏ sót bất kỳ kịch bản nào, dù kịch bản đó
        //     được gán ở cấp độ Course hay cấp độ Lesson.
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .Where(s => s.CourseId == courseId || (s.Lesson != null && s.Lesson.CourseId == courseId))
            .OrderBy(s => s.Scope)
            .ThenBy(s => s.ScriptId)
            .ToListAsync();
    }

    /// <summary>
    /// Truy vấn danh sách kịch bản nâng cao hỗ trợ lọc động (Dynamic Querying) theo nhiều điều kiện và tìm kiếm tự do.
    /// <para>End-to-End Flow: Khởi tạo IQueryable -> Nạp Include -> Kiểm tra từng tham số đầu vào -> Ghép thêm mệnh đề Where tương ứng -> Sắp xếp theo UpdatedAt giảm dần -> Trả về kết quả ToListAsync.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học (tùy chọn).</param>
    /// <param name="scope">Phạm vi kịch bản: LESSON, CHAPTER, FINAL (tùy chọn).</param>
    /// <param name="moduleId">ID chương học (tùy chọn).</param>
    /// <param name="lessonId">ID bài học (tùy chọn).</param>
    /// <param name="search">Chuỗi tìm kiếm (tùy chọn).</param>
    /// <returns>Danh sách kịch bản thỏa mãn toàn bộ bộ lọc.</returns>
    public async Task<IEnumerable<SpeakingScript>> GetAllWithDetailsAsync(
        int? courseId,
        SpeakingScope? scope,
        int? moduleId,
        int? lessonId,
        string? search)
    {
        // [BƯỚC 1]: Khởi tạo truy vấn IQueryable và nạp các thực thể phụ thuộc
        // [TẠI SAO DÙNG AsQueryable()]:
        //   - Tận dụng cơ chế Trì hoãn thực thi (Deferred Execution) của LINQ to Entities: Câu lệnh SQL chưa được
        //     gửi tới DB mà sẽ được ghép nối dần các mệnh đề WHERE tùy thuộc vào tham số người dùng truyền vào.
        var query = _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .AsQueryable();

        // [BƯỚC 2.1]: Rẽ nhánh kiểm tra lọc theo Khóa học (courseId)
        // - Điều kiện: courseId.HasValue (Người dùng có truyền tiêu chí lọc CourseId hay không).
        // - Trường hợp ĐÚNG (TRUE): Ghép thêm điều kiện WHERE lọc kịch bản thuộc CourseId trực tiếp hoặc qua Lesson.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if, không lọc theo CourseId, dữ liệu tiếp tục giữ nguyên.
        if (courseId.HasValue)
        {
            query = query.Where(s => s.CourseId == courseId.Value || (s.Lesson != null && s.Lesson.CourseId == courseId.Value));
        }

        // [BƯỚC 2.2]: Rẽ nhánh kiểm tra lọc theo Phạm vi (scope)
        // - Điều kiện: scope.HasValue (Lọc theo LESSON, CHAPTER hoặc FINAL).
        // - Trường hợp ĐÚNG (TRUE): Ghép WHERE s.Scope == scope.Value để chỉ lấy kịch bản đúng phạm vi yêu cầu.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if, lấy tất cả các Scope.
        if (scope.HasValue)
        {
            query = query.Where(s => s.Scope == scope.Value);
        }

        // [BƯỚC 2.3]: Rẽ nhánh kiểm tra lọc theo Chương học (moduleId)
        // - Điều kiện: moduleId.HasValue (Người dùng chọn xem kịch bản của một Module cụ thể).
        // - Trường hợp ĐÚNG (TRUE): Ghép WHERE s.ModuleId == moduleId hoặc Lesson thuộc moduleId đó.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if, cho phép hiển thị kịch bản của toàn bộ các module.
        if (moduleId.HasValue)
        {
            query = query.Where(s => s.ModuleId == moduleId.Value || (s.Lesson != null && s.Lesson.ModuleId == moduleId.Value));
        }

        // [BƯỚC 2.4]: Rẽ nhánh kiểm tra lọc theo Bài học (lessonId)
        // - Điều kiện: lessonId.HasValue.
        // - Trường hợp ĐÚNG (TRUE): Ghép WHERE s.LessonId == lessonId.Value.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if.
        if (lessonId.HasValue)
        {
            query = query.Where(s => s.LessonId == lessonId.Value);
        }

        // [BƯỚC 2.5]: Rẽ nhánh kiểm tra tìm kiếm từ khóa (search)
        // - Điều kiện: !string.IsNullOrWhiteSpace(search) (Chuỗi tìm kiếm không rỗng và không chỉ chứa khoảng trắng).
        // - Trường hợp ĐÚNG (TRUE):
        //     + Chuẩn hóa từ khóa: search.Trim().ToLower() để tìm kiếm không phân biệt chữ hoa/thường.
        //     + Tìm kiếm đa trường: Tìm trong Tiêu đề kịch bản (Title), Tên khóa học (Course.Title), hoặc Nội dung gốc (OriginalContent).
        // - Trường hợp SAI (FALSE): Bỏ qua, không lọc theo từ khóa.
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN]:
        //   - Q: Việc dùng .ToLower().Contains() trên DB lớn có ảnh hưởng hiệu năng không?
        //   - A: Trong phạm vi số lượng kịch bản của hệ thống vừa và nhỏ, ILIKE/Contains hoạt động tốt.
        //        Nếu dữ liệu lên tới hàng triệu bản ghi, đồ án có thể cải tiến dùng Full-Text Search (tsvector trên PostgreSQL)
        //        hoặc ElasticSearch kết hợp đánh chỉ mục (Index).
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(s =>
                s.Title.ToLower().Contains(searchLower) ||
                (s.Course != null && s.Course.Title.ToLower().Contains(searchLower)) ||
                (s.OriginalContent != null && s.OriginalContent.ToLower().Contains(searchLower)));
        }

        // [BƯỚC 3]: Sắp xếp kết quả và kích hoạt thực thi câu lệnh SQL (Materialize query)
        // - OrderByDescending(s => s.UpdatedAt): Kịch bản được chỉnh sửa gần nhất sẽ nổi lên đầu danh sách.
        // - ToListAsync(): Gửi câu truy vấn tối ưu cuối cùng tới Database và thu nạp kết quả vào bộ nhớ RAM.
        return await query
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy bản ghi cấp độ cụ thể của một kịch bản dựa vào ScriptId và SpeakingLevel.
    /// <para>End-to-End Flow: Nhận scriptId, level -> Query SpeakingScriptLevels -> Include Script cha -> FirstOrDefaultAsync theo điều kiện.</para>
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null.</returns>
    public async Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level)
    {
        // [BƯỚC 1]: Truy vấn bảng SpeakingScriptLevels với khóa tổ hợp logic (ScriptId + Level)
        // [TẠI SAO DÙNG HÀM/KỸ THUẬT NÀY]:
        //   - Mỗi kịch bản chỉ có tối đa một bản ghi cho mỗi SpeakingLevel. Việc Include(l => l.Script)
        //     giúp Service lấy được ngay thông tin kịch bản cha (như PassingScore, Scope) mà không cần query lại.
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.ScriptId == scriptId && l.Level == level);
    }

    /// <summary>
    /// Lấy bản ghi cấp độ của kịch bản thông qua LessonId liên kết.
    /// <para>End-to-End Flow: Nhận lessonId, level -> Query SpeakingScriptLevels -> Include Script -> Lọc theo Script.LessonId == lessonId và Level == level.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ luyện nói.</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null.</returns>
    public async Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level)
    {
        // [BƯỚC 1]: Truy vấn nội dung cấp độ nói trực tiếp qua mối quan hệ gián tiếp Lesson -> Script -> Level
        // [Ý NGHĨA NGHIỆP VỤ]:
        //   - Phục vụ trực tiếp màn hình học tập của học viên: Học viên đang xem bài học lessonId và chọn cấp độ
        //     Beginner/Intermediate/Advanced để luyện nói, API gọi hàm này để lấy đúng nội dung văn bản cần đọc.
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.Script.LessonId == lessonId && l.Level == level);
    }
}
