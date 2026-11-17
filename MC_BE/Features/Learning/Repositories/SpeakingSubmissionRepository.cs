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
/// Lớp triển khai Repository cho thực thể bài nộp Speaking (SpeakingSubmission).
/// </summary>
public class SpeakingSubmissionRepository : GenericRepository<SpeakingSubmission>, ISpeakingSubmissionRepository
{
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Repository với DbContext được inject từ DI Container.
    /// </summary>
    /// <param name="context">SmartMcDbContext kết nối cơ sở dữ liệu.</param>
    public SpeakingSubmissionRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    /// <summary>
    /// Hàm dùng chung (Helper Method) cấu hình Eager Loading toàn bộ các quan hệ phức tạp của SpeakingSubmission.
    /// <para>End-to-End Flow: Khởi tạo query trên DbSet SpeakingSubmissions -> Include SpeakingScript (Course, Instructor, Module) -> Include Lesson (Course, Instructor, Module) -> Include Learner -> Include GradedBy.</para>
    /// </summary>
    /// <returns>Đối tượng IQueryable sẵn sàng để ghép thêm điều kiện Where và Sắp xếp.</returns>
    private IQueryable<SpeakingSubmission> IncludeSubmissionDetails()
    {
        // [BƯỚC 1]: Xây dựng cây quan hệ lồng nhau (Nested Navigation Properties)
        // [TẠI SAO DÙNG KỸ THUẬT NÀY]:
        //   - Áp dụng nguyên lý DRY (Don't Repeat Yourself): Tập trung logic Include các bảng vào một phương thức
        //     duy nhất, giúp mã nguồn nhất quán và dễ bảo trì khi cấu trúc quan hệ thay đổi.
        //   - Nạp đầy đủ thông tin giảng viên (c.Instructor) và thông tin người nộp (Learner) trong 1 round-trip SQL,
        //     ngăn chặn triệt để hiện tượng N+1 Query.
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN]:
        //   - Q: Việc Include quá nhiều bảng như thế này có làm nặng bộ nhớ không?
        //   - A: Có tạo ra câu lệnh JOIN tương đối lớn, tuy nhiên các bảng liên kết (User, Course, Lesson)
        //     đều có quan hệ 1-1 hoặc N-1 nên không gây hiện tượng bùng nổ dòng dữ liệu (Cartesian product).
        //     Để tối ưu hơn nữa ở các API chỉ đọc danh sách lớn, có thể dùng Projection (.Select) sang DTO.
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
    /// Lấy chi tiết một bài nộp theo ID duy nhất (submissionId).
    /// <para>End-to-End Flow: Gọi IncludeSubmissionDetails() -> Lọc theo s.SubmissionId == submissionId -> FirstOrDefaultAsync.</para>
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission hoặc null nếu không tồn tại.</returns>
    public async Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId)
    {
        // [BƯỚC 1]: Thực thi truy vấn lấy bài nộp duy nhất theo Khóa chính SubmissionId
        return await IncludeSubmissionDetails()
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
    }

    /// <summary>
    /// Lấy danh sách toàn bộ bài nộp của một học viên cụ thể.
    /// <para>End-to-End Flow: IncludeSubmissionDetails -> Where(s.LearnerId == learnerId) -> OrderByDescending(SubmittedAt) -> ToListAsync.</para>
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên sắp xếp theo ngày nộp mới nhất.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId)
    {
        // [BƯỚC 1]: Lọc các bài nộp thuộc về học viên có LearnerId tương ứng
        // [Ý NGHĨA NGHIỆP VỤ]: Phục vụ màn hình "Lịch sử nộp bài" của học viên để tự theo dõi tiến trình của mình.
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy danh sách tất cả các bài nộp cần chấm điểm thuộc các khóa học mà giảng viên này giảng dạy.
    /// <para>End-to-End Flow: IncludeSubmissionDetails -> Where theo InstructorId của khóa học (qua Lesson hoặc qua SpeakingScript) -> Sắp xếp SubmittedAt giảm dần -> ToListAsync.</para>
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp cần chấm của giảng viên.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId)
    {
        // [BƯỚC 1]: Lọc bài nộp dựa trên quyền sở hữu khóa học của giảng viên
        // [GIẢI PHẪU ĐIỀU KIỆN LỌC]:
        //   - Nhánh 1: (s.Lesson != null && s.Lesson.Course != null && s.Lesson.Course.InstructorId == instructorId)
        //     => Bài nộp theo bài học con thuộc khóa học của giảng viên.
        //   - Nhánh 2: (s.SpeakingScript != null && s.SpeakingScript.Course != null && s.SpeakingScript.Course.InstructorId == instructorId)
        //     => Bài nộp theo kịch bản bài thi (Final/Chapter) thuộc khóa học của giảng viên.
        // [TẠI SAO PHẢI CHECK CẢ 2 NHÁNH]:
        //   - Đảm bảo tính bảo mật và phân quyền chính xác (Role-Based / Resource-Based Authorization):
        //     Giảng viên A không bao giờ nhìn thấy hoặc chấm nhầm bài nộp của giảng viên B.
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.Course != null && s.Lesson.Course.InstructorId == instructorId) ||
                (s.SpeakingScript != null && s.SpeakingScript.Course != null && s.SpeakingScript.Course.InstructorId == instructorId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy danh sách các bài nộp thuộc một khóa học cụ thể.
    /// <para>End-to-End Flow: IncludeSubmissionDetails -> Where CourseId trùng khớp qua Lesson hoặc SpeakingScript -> OrderByDescending -> ToListAsync.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp trong khóa học.</returns>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId)
    {
        // [BƯỚC 1]: Lọc bài nộp theo phạm vi toàn bộ khóa học
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.CourseId == courseId) ||
                (s.SpeakingScript != null && s.SpeakingScript.CourseId == courseId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy bài nộp mới nhất của một học viên cho một bài học cụ thể.
    /// <para>End-to-End Flow: IncludeSubmissionDetails -> Where(LearnerId và LessonId) -> OrderByDescending(SubmittedAt) -> FirstOrDefaultAsync.</para>
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bản ghi bài nộp mới nhất hoặc null nếu học viên chưa từng nộp.</returns>
    public async Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId)
    {
        // [BƯỚC 1]: Lọc theo cặp (LearnerId, LessonId) và lấy bản ghi nộp gần nhất
        // [Ý NGHĨA NGHIỆP VỤ CỐT LÕI]:
        //   - Đây là điểm mấu chốt để hệ thống thực hiện nghiệp vụ "Khóa nộp bài":
        //     Service sẽ kiểm tra bài nộp mới nhất này, nếu trạng thái là "PENDING" (đang đợi giáo viên chấm),
        //     hoặc điểm số đã đạt ">= 80", hệ thống sẽ từ chối không cho học viên nộp thêm bài mới để tránh spam.
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && s.LessonId == lessonId)
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Lấy bài nộp mới nhất của một học viên cho một kịch bản nói cụ thể (bài thi Final/Chapter hoặc qua Lesson).
    /// <para>End-to-End Flow: IncludeSubmissionDetails -> Where(LearnerId và ScriptId trực tiếp hoặc qua Lesson.SpeakingScript) -> OrderByDescending(SubmittedAt) -> FirstOrDefaultAsync.</para>
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bản ghi bài nộp mới nhất hoặc null.</returns>
    public async Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId)
    {
        // [BƯỚC 1]: Lọc bài nộp gần nhất theo kịch bản
        // [GIẢI PHẪU ĐIỀU KIỆN]:
        //   - s.ScriptId == scriptId: Nộp bài trực tiếp với ScriptId (Bài thi Final / Chapter).
        //   - Hoặc bài học s.Lesson có kịch bản trùng với scriptId.
        // [Ý NGHĨA NGHIỆP VỤ]: Kiểm soát trạng thái vượt qua bài thi nói của học viên để mở khóa chứng chỉ tốt nghiệp.
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && (s.ScriptId == scriptId || (s.Lesson != null && s.Lesson.SpeakingScript != null && s.Lesson.SpeakingScript.ScriptId == scriptId)))
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }
}
