// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Data Access Layer (Repository Implementation) trong Repository Pattern.
// - Nằm trong module: Features/Learning/Repositories.
// - Kế thừa từ: GenericRepository<SpeakingSubmission> và triển khai ISpeakingSubmissionRepository.
// - Vai trò: Quản lý toàn bộ truy xuất cơ sở dữ liệu đối với bảng SpeakingSubmissions.
//   Sử dụng Entity Framework Core với kỹ thuật Eager Loading sâu (Multi-level ThenInclude)
//   để nạp đầy đủ thông tin Học viên, Giảng viên chấm bài, Khóa học và Bài học.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp dữ liệu phục vụ quy trình nộp và chấm bài nói:
//   1. Cho học viên: Xem lịch sử làm bài, nghe lại audio đã nộp, xem điểm và nhận xét của thầy cô.
//   2. Cho giảng viên: Xem danh sách bài nộp cần chấm thuộc các khóa học mà mình phụ trách.
//   3. Cho hệ thống kiểm soát khóa học (LearningAccessService): Tra cứu bài nộp mới nhất
//      (GetLatestByLearnerAndLessonAsync, GetLatestByLearnerAndScriptAsync) để ngăn chặn nộp trùng lặp
//      khi bài trước đang "PENDING" hoặc đã đạt điểm chuẩn (>= 80).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Input: ID của học viên, giảng viên, khóa học hoặc bài học từ SpeakingSubmissionService / LearningAccessService.
// - Process: Tái sử dụng phương thức tập trung IncludeSubmissionDetails() để chuẩn hóa câu query.
// - Output: Trả về đối tượng thực thể SpeakingSubmission hoàn chỉnh kèm các quan hệ liên kết.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Repositories;

/// <summary>
/// [Định nghĩa Lớp]: Lớp triển khai Repository cho thực thể bài nộp Speaking (SpeakingSubmission).
/// [Giải phẫu cú pháp]:
/// - `public`: Cho phép đăng ký DI và sử dụng ở tầng Service.
/// - `class`: Lớp triển khai cụ thể.
/// - `: GenericRepository<SpeakingSubmission>`: Thừa hưởng các hàm CRUD generic (Add, Update, Remove...).
/// - `, ISpeakingSubmissionRepository`: Triển khai giao diện chuyên biệt cho bài nộp Speaking.
/// </summary>
public class SpeakingSubmissionRepository : GenericRepository<SpeakingSubmission>, ISpeakingSubmissionRepository
{
    /// <summary>
    /// [Dòng này làm gì]: Khai báo trường DbContext để truy vấn cơ sở dữ liệu.
    /// [Giải phẫu từng từ khóa]:
    /// - `private`: Đảm bảo tính đóng gói, chỉ sử dụng nội bộ lớp này.
    /// - `readonly`: Bất biến sau khi khởi tạo trong Constructor.
    /// - `SmartMcDbContext _context`: Đối tượng DbContext của hệ thống MSEEK.
    /// </summary>
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// [Dòng này làm gì]: Constructor nhận DbContext từ DI Container.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Constructor công khai.
    /// - `SmartMcDbContext context`: Instance DbContext được tiêm vào theo vòng đời Scoped.
    /// - `: base(context)`: Gọi constructor của lớp cha GenericRepository để gán context và khởi tạo DbSet.
    /// </summary>
    /// <param name="context">SmartMcDbContext kết nối cơ sở dữ liệu.</param>
    public SpeakingSubmissionRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm dùng chung (Private Helper Method) cấu hình Eager Loading toàn bộ các quan hệ phức tạp của SpeakingSubmission.
    /// - End-to-End Flow:
    ///   - Bước 1: Khởi tạo IQueryable trên DbSet SpeakingSubmissions.
    ///   - Bước 2: Nạp chuỗi quan hệ qua SpeakingScript -> Course -> Instructor và Module.
    ///   - Bước 3: Nạp chuỗi quan hệ qua Lesson -> Course -> Instructor và Module.
    ///   - Bước 4: Nạp thông tin học viên (Learner) và người chấm (GradedBy).
    ///   - Bước 5: Trả về đối tượng IQueryable sẵn sàng cho việc ghép thêm điều kiện Where và Sắp xếp.
    /// [Giải phẫu từng từ khóa & hàm]:
    /// - `private`: Chỉ dùng nội bộ repository này.
    /// - `IQueryable<SpeakingSubmission>`: Kiểu biểu diễn câu truy vấn SQL chưa thực thi, cho phép ghép nối thêm các toán tử LINQ.
    /// - `.Include(...)`: Mở quan hệ cấp 1 (Navigation Property) sinh lệnh SQL `LEFT JOIN`.
    /// - `.ThenInclude(...)`: Mở quan hệ cấp 2, cấp 3 lồng nhau từ bảng vừa được Include trước đó.
    /// - `sc!`: Toán tử Null-forgiving trong biểu thức lambda báo cho trình biên dịch biết sc không bị null khi thực hiện ThenInclude.
    /// [Tại sao dùng kỹ thuật này]:
    /// - Áp dụng nguyên lý DRY (Don't Repeat Yourself): Gom toàn bộ logic Include phức tạp vào 1 nơi duy nhất, giúp bảo trì dễ dàng và đảm bảo mọi API đều nạp đủ dữ liệu, chống lỗi N+1 Query.
    /// </summary>
    /// <returns>Đối tượng IQueryable sẵn sàng để ghép thêm điều kiện Where và Sắp xếp.</returns>
    private IQueryable<SpeakingSubmission> IncludeSubmissionDetails()
    {
        return _context.SpeakingSubmissions
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Module)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy chi tiết một bài nộp theo ID duy nhất (submissionId).
    /// - End-to-End Flow: Gọi IncludeSubmissionDetails() -> Lọc theo điều kiện s.SubmissionId == submissionId -> FirstOrDefaultAsync().
    /// [Giải phẫu từng từ khóa]:
    /// - `public async Task<SpeakingSubmission?>`: Hàm bất đồng bộ trả về thực thể SpeakingSubmission hoặc null.
    /// - `await`: Đợi kết quả truy vấn từ Database mà không làm block luồng thực thi.
    /// - `.FirstOrDefaultAsync(s => s.SubmissionId == submissionId)`: Truy vấn theo Khóa chính SubmissionId, trả về bản ghi đầu tiên hoặc null nếu không tồn tại.
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission hoặc null nếu không tồn tại.</returns>
    public async Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId)
    {
        return await IncludeSubmissionDetails()
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách toàn bộ bài nộp của một học viên cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(s.LearnerId == learnerId) -> OrderByDescending(s.SubmittedAt) -> ToListAsync().
    /// [Giải phẫu từng hàm]:
    /// - `.Where(s => s.LearnerId == learnerId)`: Lọc các bài nộp của học viên trong bảng Users.
    /// - `.OrderByDescending(s => s.SubmittedAt)`: Bài nộp gần nhất sẽ được xếp lên đầu danh sách (dòng thời gian giảm dần).
    /// - `.ToListAsync()`: Thực thi câu lệnh SQL và trả về danh sách đối tượng trong bộ nhớ RAM.
    /// [Ý nghĩa nghiệp vụ]: Phục vụ màn hình "Lịch sử nộp bài" của học viên để tự theo dõi tiến trình của mình.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên sắp xếp theo ngày nộp mới nhất.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách tất cả các bài nộp cần chấm điểm thuộc các khóa học mà giảng viên này giảng dạy.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where theo InstructorId của khóa học (qua Lesson hoặc qua SpeakingScript) -> Sắp xếp SubmittedAt giảm dần -> ToListAsync().
    /// [Giải phẫu điều kiện rẽ nhánh trong mệnh đề .Where()]:
    /// - Nhánh 1: `(s.Lesson != null && s.Lesson.Course != null && s.Lesson.Course.InstructorId == instructorId)`
    ///   => Bài nộp theo bài học con thuộc khóa học của giảng viên.
    /// - Nhánh 2: `(s.SpeakingScript != null && s.SpeakingScript.Course != null && s.SpeakingScript.Course.InstructorId == instructorId)`
    ///   => Bài nộp theo kịch bản bài thi (Final/Chapter) thuộc khóa học của giảng viên.
    /// [Tại sao phải kiểm tra cả 2 nhánh]:
    /// - Đảm bảo tính bảo mật và phân quyền chính xác (Role-Based / Resource-Based Authorization):
    ///   Giảng viên A không bao giờ nhìn thấy hoặc chấm nhầm bài nộp của giảng viên B.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp cần chấm của giảng viên.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId)
    {
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.Course != null && s.Lesson.Course.InstructorId == instructorId) ||
                (s.SpeakingScript != null && s.SpeakingScript.Course != null && s.SpeakingScript.Course.InstructorId == instructorId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách các bài nộp thuộc một khóa học cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where CourseId trùng khớp qua Lesson hoặc SpeakingScript -> OrderByDescending -> ToListAsync().
    /// [Giải phẫu điều kiện trong .Where()]:
    /// - `(s.Lesson != null && s.Lesson.CourseId == courseId)`: Bài nộp gắn với bài học của khóa học.
    /// - `|| (s.SpeakingScript != null && s.SpeakingScript.CourseId == courseId)`: Bài nộp gắn với kịch bản độc lập của khóa học.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp trong khóa học.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId)
    {
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.CourseId == courseId) ||
                (s.SpeakingScript != null && s.SpeakingScript.CourseId == courseId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy bài nộp mới nhất của một học viên cho một bài học cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(s.LearnerId == learnerId && s.LessonId == lessonId) -> OrderByDescending(s.SubmittedAt) -> FirstOrDefaultAsync().
    /// [Ý nghĩa nghiệp vụ cốt lõi]:
    /// - Đây là điểm mấu chốt để hệ thống thực hiện nghiệp vụ "Khóa nộp bài thông minh" (Resubmission Lock):
    ///   Service sẽ kiểm tra bài nộp mới nhất này:
    ///   + Nếu trạng thái là "SUBMITTED" (hoặc Score == null): Bài đang đợi giáo viên chấm, hệ thống từ chối nộp đè.
    ///   + Nếu điểm số đã đạt "Score >= 80": Đã đạt chuẩn đầu ra, hệ thống từ chối nộp lại để bảo toàn kết quả.
    ///   + Nếu điểm số "Score < 80" và đã có điểm: Bài bị trượt, hệ thống cho phép ghi đè/nộp lại để cải thiện điểm.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bản ghi bài nộp mới nhất hoặc null nếu học viên chưa từng nộp.</returns>
    public async Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && s.LessonId == lessonId)
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy bài nộp mới nhất của một học viên cho một kịch bản nói cụ thể (bài thi Final/Chapter hoặc qua Lesson).
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(LearnerId và ScriptId trực tiếp hoặc qua Lesson.SpeakingScript) -> OrderByDescending(SubmittedAt) -> FirstOrDefaultAsync().
    /// [Giải phẫu điều kiện trong .Where()]:
    /// - `s.LearnerId == learnerId`: Đúng học viên thực hiện.
    /// - `s.ScriptId == scriptId`: Bài nộp trực tiếp với ScriptId (Bài thi Final / Chapter).
    /// - `|| (s.Lesson != null && s.Lesson.SpeakingScript != null && s.Lesson.SpeakingScript.ScriptId == scriptId)`: Bài nộp theo bài học có kịch bản tương ứng.
    /// [Ý nghĩa nghiệp vụ]: Kiểm soát trạng thái vượt qua bài thi nói của học viên để mở khóa chứng chỉ tốt nghiệp.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bản ghi bài nộp mới nhất hoặc null.</returns>
    public async Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && (s.ScriptId == scriptId || (s.Lesson != null && s.Lesson.SpeakingScript != null && s.Lesson.SpeakingScript.ScriptId == scriptId)))
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }
}
