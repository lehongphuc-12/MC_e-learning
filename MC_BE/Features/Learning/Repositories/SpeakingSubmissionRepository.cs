
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Repositories;

/// <summary>
/// [Định nghĩa Lớp]: Lớp triển khai Repository cho thực thể bài nộp Speaking (SpeakingSubmission).
/// </summary>
public class SpeakingSubmissionRepository : GenericRepository<SpeakingSubmission>, ISpeakingSubmissionRepository
{
    /// <summary>trường DbContext để truy vấn cơ sở dữ liệu.</summary>
    private readonly SmartMcDbContext _context;
    /// <summary>Constructor nhận DbContext từ DI Container.</summary>
    /// <param name="context">SmartMcDbContext kết nối cơ sở dữ liệu.</param>
    public SpeakingSubmissionRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    /// <summary>
    /// - Hàm dùng chung (Private Helper Method) cấu hình Eager Loading toàn bộ các quan hệ phức tạp của SpeakingSubmission.
    /// - End-to-End Flow:
    ///   - Bước 1: Khởi tạo IQueryable trên DbSet SpeakingSubmissions.
    ///   - Bước 2: Nạp chuỗi quan hệ qua SpeakingScript -> Course -> Instructor và Module.
    ///   - Bước 3: Nạp chuỗi quan hệ qua Lesson -> Course -> Instructor và Module.
    ///   - Bước 4: Nạp thông tin học viên (Learner) và người chấm (GradedBy).
    ///   - Bước 5: Trả về đối tượng IQueryable sẵn sàng cho việc ghép thêm điều kiện Where và Sắp xếp.
    /// - Áp dụng nguyên lý DRY (Don't Repeat Yourself): Gom toàn bộ logic Include phức tạp vào 1 nơi duy nhất, giúp bảo trì dễ dàng và đảm bảo mọi API đều nạp đủ dữ liệu, chống lỗi N+1 Query.
    /// </summary>
    /// <returns>Đối tượng IQueryable sẵn sàng để ghép thêm điều kiện Where và Sắp xếp.</returns>
    private IQueryable<SpeakingSubmission> IncludeSubmissionDetails()
    {
        return _context.SpeakingSubmissions
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.RubricCriteria)
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Module)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.SpeakingScript)
                    .ThenInclude(sc => sc!.RubricCriteria)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy);
    }

    /// <summary>
    /// - Lấy chi tiết một bài nộp theo ID duy nhất (submissionId).
    /// - End-to-End Flow: Gọi IncludeSubmissionDetails() -> Lọc theo điều kiện s.SubmissionId == submissionId -> FirstOrDefaultAsync().
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission hoặc null nếu không tồn tại.</returns>
    public async Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId)
    {
        return await IncludeSubmissionDetails()
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
    }

    /// <summary>
    /// - Lấy danh sách toàn bộ bài nộp của một học viên cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(s.LearnerId == learnerId) -> OrderByDescending(s.SubmittedAt) -> ToListAsync().
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
    /// - Lấy danh sách tất cả các bài nộp cần chấm điểm thuộc các khóa học mà giảng viên này giảng dạy.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where theo InstructorId của khóa học (qua Lesson hoặc qua SpeakingScript) -> Sắp xếp SubmittedAt giảm dần -> ToListAsync().
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
    /// - Lấy danh sách các bài nộp thuộc một khóa học cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where CourseId trùng khớp qua Lesson hoặc SpeakingScript -> OrderByDescending -> ToListAsync().
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
    /// - Lấy bài nộp mới nhất của một học viên cho một bài học cụ thể.
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(s.LearnerId == learnerId && s.LessonId == lessonId) -> OrderByDescending(s.SubmittedAt) -> FirstOrDefaultAsync().
    /// [Ý nghĩa nghiệp vụ cốt lõi]:
    /// - Đây là điểm mấu chốt để hệ thống thực hiện nghiệp vụ "Khóa nộp bài thông minh" (Resubmission Lock):
    ///   Service sẽ kiểm tra bài nộp mới nhất này:
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
    /// - Lấy bài nộp mới nhất của một học viên cho một kịch bản nói cụ thể (bài thi Final/Chapter hoặc qua Lesson).
    /// - End-to-End Flow: IncludeSubmissionDetails() -> Where(LearnerId và ScriptId trực tiếp hoặc qua Lesson.SpeakingScript) -> OrderByDescending(SubmittedAt) -> FirstOrDefaultAsync().
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

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài nói của một học viên cho một kịch bản nói, sắp xếp tăng dần theo thời gian nộp.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAndScriptAsync(int learnerId, int scriptId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && (s.ScriptId == scriptId || (s.Lesson != null && s.Lesson.SpeakingScript != null && s.Lesson.SpeakingScript.ScriptId == scriptId)))
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài nói của một học viên cho một bài học, sắp xếp tăng dần theo thời gian nộp.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAndLessonAsync(int learnerId, int lessonId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && s.LessonId == lessonId)
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync();
    }
}
