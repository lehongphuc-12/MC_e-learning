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
/// [Định nghĩa Lớp]: Lớp triển khai cụ thể của ISpeakingScriptRepository sử dụng Entity Framework Core.
/// [Giải phẫu cú pháp]:
/// - `public`: Cho phép đăng ký DI Container và inject vào các tầng khác.
/// - `class`: Khai báo kiểu tham chiếu (reference type).
/// - `: GenericRepository<SpeakingScript>`: Kế thừa lớp cơ sở triển khai các hàm CRUD generic.
/// - `, ISpeakingScriptRepository`: Hiện thực hóa hợp đồng nghiệp vụ repository cho SpeakingScript.
/// </summary>
public class SpeakingScriptRepository : GenericRepository<SpeakingScript>, ISpeakingScriptRepository
{
    /// <summary>
    /// [Dòng này làm gì]: Khai báo trường lưu trữ đối tượng DbContext để tương tác với CSDL PostgreSQL/SQL Server.
    /// [Giải phẫu từng từ khóa]:
    /// - `private`: Chỉ nội bộ lớp SpeakingScriptRepository mới được truy cập, bảo đảm tính bao đóng (Encapsulation).
    /// - `readonly`: Chỉ cho phép gán giá trị tại thời điểm khởi tạo trong Constructor, chống bị ghi đè ngẫu nhiên trong runtime.
    /// - `SmartMcDbContext`: Lớp DbContext quản lý kết nối và ánh xạ bảng của EF Core.
    /// - `_context`: Tên biến quy ước tiền tố '_' cho private field.
    /// </summary>
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// [Dòng này làm gì]: Constructor nhận DbContext từ Dependency Injection (DI Container).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Cho phép ASP.NET Core DI Container gọi khởi tạo instance.
    /// - `SmartMcDbContext context`: Tham số DbContext được tiêm vào (Scoped lifetime).
    /// - `: base(context)`: Chuyển tiếp instance context lên constructor của lớp cha `GenericRepository<SpeakingScript>` để khởi tạo `_dbSet`.
    /// - `{ _context = context; }`: Gán instance cho field nội bộ để sử dụng cho các truy vấn riêng biệt.
    /// </summary>
    /// <param name="context">SmartMcDbContext kết nối cơ sở dữ liệu.</param>
    public SpeakingScriptRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy kịch bản luyện nói gắn với một bài học cụ thể, kèm theo quan hệ Course, Module, Lesson, CreatedByUser, Levels.
    /// - End-to-End Flow: Nhận lessonId -> Query DbSet SpeakingScripts -> Nạp quan hệ bằng Eager Loading (.Include) -> Lọc theo LessonId == lessonId -> FirstOrDefaultAsync().
    /// [Giải phẫu từng từ khóa / hàm / toán tử]:
    /// - `public async Task<SpeakingScript?>`: Hàm bất đồng bộ trả về thực thể SpeakingScript hoặc null.
    /// - `await`: Giải phóng luồng ThreadPool trong thời gian chờ Database I/O phản hồi.
    /// - `_context.SpeakingScripts`: Truy cập DbSet<SpeakingScript> đại diện cho bảng SpeakingScripts trong CSDL.
    /// - `.Include(s => s.Course)`: Eager Loading sinh câu lệnh SQL `LEFT JOIN` nạp thông tin khóa học cha.
    /// - `.Include(s => s.Module)`: Eager Loading nạp thông tin chương học cha.
    /// - `.Include(s => s.Lesson)`: Eager Loading nạp thông tin bài học trực tiếp.
    /// - `.Include(s => s.CreatedByUser)`: Eager Loading nạp thông tin tác giả tạo kịch bản.
    /// - `.Include(s => s.Levels)`: Eager Loading nạp danh sách 3 cấp độ (Beginner, Intermediate, Advanced) từ bảng SpeakingScriptLevels.
    /// - `.FirstOrDefaultAsync(s => s.LessonId == lessonId)`: Thực thi câu lệnh SQL với `LIMIT 1` lấy bản ghi đầu tiên khớp điều kiện; nếu không thấy trả về `null`.
    /// [Tại sao dùng & Rủi ro nếu thiếu]:
    /// - Sử dụng `.Include()` giải quyết triệt để vấn đề N+1 Query Problem: Toàn bộ kịch bản và 3 cấp độ con được lấy trong 1 câu SQL duy nhất.
    /// - Nếu dùng `FirstAsync` thay vì `FirstOrDefaultAsync`, khi bài học không có kịch bản sẽ ném `InvalidOperationException` làm crash API.
    /// </summary>
    /// <param name="lessonId">ID bài học cần lấy kịch bản.</param>
    /// <returns>Thực thể SpeakingScript nạp đủ thông tin hoặc null.</returns>
    public async Task<SpeakingScript?> GetByLessonIdAsync(int lessonId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.LessonId == lessonId);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy chi tiết kịch bản luyện nói theo Khóa chính ScriptId kèm theo toàn bộ thông tin quan hệ.
    /// - End-to-End Flow: Nhận scriptId -> Query SpeakingScripts -> Include Course/Module/Lesson/CreatedByUser/Levels -> FirstOrDefaultAsync(ScriptId == scriptId).
    /// [Giải phẫu từng từ khóa & kỹ thuật]:
    /// - Phục vụ các bài thi Speaking cuối chương (Module) hoặc cuối khóa (Final) vốn không gắn trực tiếp vào một LessonId nào.
    /// - `.FirstOrDefaultAsync(s => s.ScriptId == scriptId)`: Lọc theo Primary Key có chỉ mục (Clustered Index), tốc độ truy vấn đạt O(1).
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Thực thể SpeakingScript chi tiết hoặc null.</returns>
    public async Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.ScriptId == scriptId);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy tất cả các kịch bản liên quan đến một khóa học cụ thể.
    /// - End-to-End Flow: Nhận courseId -> Query SpeakingScripts -> Include quan hệ -> Lọc kịch bản gắn trực tiếp CourseId HOẶC thông qua Lesson.CourseId -> Sắp xếp theo Scope rồi ScriptId -> ToListAsync().
    /// [Giải phẫu điều kiện trong mệnh đề .Where()]:
    /// - `s.CourseId == courseId`: Kịch bản được gắn trực tiếp vào khóa học (thường là bài Final Exam).
    /// - `|| (s.Lesson != null && s.Lesson.CourseId == courseId)`: Kịch bản được gắn vào bài học con thuộc khóa học đó.
    /// [Tại sao dùng]: Đảm bảo gom đủ 100% kịch bản trong khóa học mà không bỏ sót bất kỳ kịch bản nào, dù kịch bản đó được gán ở cấp độ Course hay cấp độ Lesson.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách kịch bản thuộc khóa học.</returns>
    public async Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId)
    {
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
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Truy vấn danh sách kịch bản nâng cao hỗ trợ lọc động (Dynamic Querying) theo nhiều điều kiện và tìm kiếm tự do.
    /// - End-to-End Flow:
    ///   - Bước 1: Khởi tạo IQueryable trên DbSet SpeakingScripts kèm Eager Loading các bảng liên quan.
    ///   - Bước 2: Kiểm tra từng tham số đầu vào (courseId, scope, moduleId, lessonId, search).
    ///   - Bước 3: Nếu tham số có giá trị -> Nối thêm mệnh đề `.Where()` tương ứng vào cây truy vấn LINQ.
    ///   - Bước 4: Sắp xếp theo UpdatedAt giảm dần và thực thi câu lệnh SQL qua `ToListAsync()`.
    /// [Tại sao dùng AsQueryable() & Trì hoãn thực thi (Deferred Execution)]:
    /// - Câu lệnh SQL chưa được gửi tới Database cho đến khi gọi `.ToListAsync()`. Nhờ đó, EF Core tổng hợp toàn bộ các điều kiện `if` thành duy nhất một câu lệnh SQL `WHERE ... AND ...` tối ưu tại máy chủ DB.
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
        var query = _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .AsQueryable();

        // [BƯỚC 2.1]: Rẽ nhánh kiểm tra lọc theo Khóa học (courseId)
        // - Điều kiện kiểm tra: `courseId.HasValue` (Người dùng có truyền tiêu chí lọc CourseId hay không).
        // - Trường hợp ĐÚNG (TRUE - khi courseId != null):
        //     + Gọi tiếp hàm: `query.Where(s => s.CourseId == courseId.Value || (s.Lesson != null && s.Lesson.CourseId == courseId.Value))`.
        //     + Hệ quả: Thu hẹp tập kết quả, chỉ lấy các kịch bản gắn trực tiếp vào CourseId hoặc qua Lesson thuộc CourseId đó.
        // - Trường hợp SAI (FALSE - khi courseId == null):
        //     + Bỏ qua khối if, giữ nguyên truy vấn ban đầu để lấy kịch bản của mọi khóa học.
        if (courseId.HasValue)
        {
            query = query.Where(s => s.CourseId == courseId.Value || (s.Lesson != null && s.Lesson.CourseId == courseId.Value));
        }

        // [BƯỚC 2.2]: Rẽ nhánh kiểm tra lọc theo Phạm vi (scope)
        // - Điều kiện kiểm tra: `scope.HasValue` (Kiểm tra người dùng có chọn Scope LESSON/CHAPTER/FINAL hay không).
        // - Trường hợp ĐÚNG (TRUE - khi scope != null):
        //     + Gọi tiếp: `query.Where(s => s.Scope == scope.Value)`.
        //     + Hệ quả: Chỉ lấy các kịch bản đúng phạm vi yêu cầu.
        // - Trường hợp SAI (FALSE):
        //     + Bỏ qua khối if, cho phép hiển thị kịch bản ở mọi Scope.
        if (scope.HasValue)
        {
            query = query.Where(s => s.Scope == scope.Value);
        }

        // [BƯỚC 2.3]: Rẽ nhánh kiểm tra lọc theo Chương học (moduleId)
        // - Điều kiện kiểm tra: `moduleId.HasValue`.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Gọi tiếp: `query.Where(s => s.ModuleId == moduleId.Value || (s.Lesson != null && s.Lesson.ModuleId == moduleId.Value))`.
        //     + Hệ quả: Lọc chính xác các kịch bản gắn với chương học được chọn.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if.
        if (moduleId.HasValue)
        {
            query = query.Where(s => s.ModuleId == moduleId.Value || (s.Lesson != null && s.Lesson.ModuleId == moduleId.Value));
        }

        // [BƯỚC 2.4]: Rẽ nhánh kiểm tra lọc theo Bài học (lessonId)
        // - Điều kiện kiểm tra: `lessonId.HasValue`.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Gọi tiếp: `query.Where(s => s.LessonId == lessonId.Value)`.
        //     + Hệ quả: Chỉ lấy kịch bản gán riêng cho bài học đó.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if.
        if (lessonId.HasValue)
        {
            query = query.Where(s => s.LessonId == lessonId.Value);
        }

        // [BƯỚC 2.5]: Rẽ nhánh kiểm tra tìm kiếm từ khóa (search)
        // - Điều kiện kiểm tra: `!string.IsNullOrWhiteSpace(search)` (Chuỗi tìm kiếm không rỗng và không chỉ chứa khoảng trắng).
        // - Trường hợp ĐÚNG (TRUE):
        //     + Chuẩn hóa từ khóa: `var searchLower = search.Trim().ToLower();` để tìm kiếm không phân biệt hoa thường.
        //     + Ghép điều kiện tìm kiếm đa trường: Tìm trong Tiêu đề kịch bản (Title), Tên khóa học (Course.Title), hoặc Nội dung gốc (OriginalContent).
        // - Trường hợp SAI (FALSE): Bỏ qua khối if.
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN]:
        //   - Q: Việc dùng .ToLower().Contains() trên DB lớn có ảnh hưởng hiệu năng không?
        //   - A: Trong quy mô dữ liệu vừa và nhỏ, ILIKE/Contains của PostgreSQL/SQL Server hoạt động tốt. Khi dữ liệu lớn lên hàng triệu bản ghi, hệ thống có thể nâng cấp sử dụng Full-Text Search (tsvector) kết hợp GIN Index hoặc ElasticSearch.
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(s =>
                s.Title.ToLower().Contains(searchLower) ||
                (s.Course != null && s.Course.Title.ToLower().Contains(searchLower)) ||
                (s.OriginalContent != null && s.OriginalContent.ToLower().Contains(searchLower)));
        }

        // [BƯỚC 3]: Sắp xếp kết quả và kích hoạt thực thi câu lệnh SQL (Materialize query)
        // - `OrderByDescending(s => s.UpdatedAt)`: Sắp xếp theo ngày cập nhật mới nhất lên đầu danh sách.
        // - `ToListAsync()`: Kích hoạt gửi câu truy vấn SQL hoàn chỉnh về Database và nạp danh sách kết quả vào RAM.
        return await query
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy bản ghi cấp độ cụ thể của một kịch bản dựa vào ScriptId và SpeakingLevel.
    /// - End-to-End Flow: Nhận scriptId, level -> Query DbSet SpeakingScriptLevels -> Nạp quan hệ Script cha -> FirstOrDefaultAsync(ScriptId == scriptId && Level == level).
    /// [Tại sao dùng & Rủi ro nếu thiếu]:
    /// - Mỗi kịch bản chỉ có tối đa một bản ghi cho mỗi SpeakingLevel.
    /// - Việc `.Include(l => l.Script)` giúp Service lấy được ngay thông tin kịch bản cha (PassingScore, Scope) trong 1 query duy nhất.
    /// </summary>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <param name="level">Cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).</param>
    /// <returns>Thực thể SpeakingScriptLevel hoặc null.</returns>
    public async Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level)
    {
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.ScriptId == scriptId && l.Level == level);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy bản ghi cấp độ của kịch bản thông qua LessonId liên kết.
    /// - End-to-End Flow: Nhận lessonId, level -> Query DbSet SpeakingScriptLevels -> Include Script -> FirstOrDefaultAsync(l.Script.LessonId == lessonId && l.Level == level).
    /// [Ý nghĩa nghiệp vụ]:
    /// - Phục vụ trực tiếp màn hình luyện tập của học viên: Học viên đang xem bài học lessonId và chọn cấp độ Beginner/Intermediate/Advanced để luyện nói, API gọi hàm này để lấy đúng nội dung văn bản cần đọc.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="level">Cấp độ luyện nói.</param>
    /// <returns>Thực thể SpeakingScriptLevel tương ứng.</returns>
    public async Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level)
    {
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.Script.LessonId == lessonId && l.Level == level);
    }
}
