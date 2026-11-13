using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Implements all Course CRUD operations.
/// Uses GenericRepository and UnitOfWork to decouple service logic from DbContext.
/// </summary>
public class CourseService : ICourseService
{
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Category> _categoryRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<PaymentItem> _paymentItemRepository;
    private readonly IGenericRepository<SpeakingSubmission> _speakingSubmissionRepository;
    private readonly IGenericRepository<Quiz> _quizRepository;
    private readonly IGenericRepository<QuizAttempt> _quizAttemptRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<CourseMaterial> _materialRepository;
    private readonly IGenericRepository<LessonProgress> _lessonProgressRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<Module> _moduleRepository;
    private readonly IGenericRepository<R2ObjectDeletionJob> _r2DeletionJobRepository;
    private readonly IGenericRepository<CourseDeletionRequest> _courseDeletionRequestRepository;
    private readonly IGenericRepository<VideoUploadSession> _videoUploadSessionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IR2StorageService _r2;
    private readonly ICourseGiftAccessService _giftAccess;
    private readonly ILearningProgressService _learningProgressService;


    public CourseService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Category> categoryRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<PaymentItem> paymentItemRepository,
        IGenericRepository<SpeakingSubmission> speakingSubmissionRepository,
        IGenericRepository<Quiz> quizRepository,
        IGenericRepository<QuizAttempt> quizAttemptRepository,
        IGenericRepository<User> userRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<CourseMaterial> materialRepository,
        IGenericRepository<LessonProgress> lessonProgressRepository,
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Module> moduleRepository,
        IGenericRepository<VideoUploadSession> videoUploadSessionRepository,
        IGenericRepository<R2ObjectDeletionJob> r2DeletionJobRepository,
        IGenericRepository<CourseDeletionRequest> courseDeletionRequestRepository,
        IUnitOfWork unitOfWork,
        IR2StorageService r2,
        ICourseGiftAccessService giftAccess)
    {
        _courseRepository = courseRepository;
        _categoryRepository = categoryRepository;
        _enrollmentRepository = enrollmentRepository;
        _paymentItemRepository = paymentItemRepository;
        _speakingSubmissionRepository = speakingSubmissionRepository;
        _quizRepository = quizRepository;
        _quizAttemptRepository = quizAttemptRepository;
        _userRepository = userRepository;
        _lessonRepository = lessonRepository;
        _materialRepository = materialRepository;
        _lessonProgressRepository = lessonProgressRepository;
        _certificateRepository = certificateRepository;
        _moduleRepository = moduleRepository;
        _videoUploadSessionRepository = videoUploadSessionRepository;
        _r2DeletionJobRepository = r2DeletionJobRepository;
        _courseDeletionRequestRepository = courseDeletionRequestRepository;
        _unitOfWork = unitOfWork;
        _r2 = r2;
        _giftAccess = giftAccess;
    }



    // -------------------------------------------------------------------------
    // Slug generation helper
    // Converts "Master of Ceremonies Training!" → "master-of-ceremonies-training"
    // Appends a short unique suffix to guarantee uniqueness in the DB.
    // -------------------------------------------------------------------------
    private static string GenerateSlug(string title)
    {
        // 1. Lowercase and trim
        var slug = title.Trim().ToLowerInvariant();
        // 2. Replace spaces and special chars with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = slug.Trim('-');
        // 3. Append a short random suffix to avoid conflicts
        var suffix = Guid.NewGuid().ToString("N")[..6];
        return $"{slug}-{suffix}";
    }

    // -------------------------------------------------------------------------
    // Map Course entity → CourseDto (project from EF navigation properties)
    // -------------------------------------------------------------------------
    private static CourseDto MapToDto(Course course) => new()
    {
        CourseId = course.CourseId,
        CategoryId = course.CategoryId,
        CategoryName = course.Category?.CategoryName,
        InstructorId = course.InstructorId,
        InstructorName = course.Instructor?.FullName,
        Title = course.Title,
        Slug = course.Slug,
        Description = course.Description,
        ThumbnailUrl = course.ThumbnailUrl,
        Price = course.Price,
        IsFree = course.IsFree,
        Level = course.Level,
        Status = course.Status,
        CreatedAt = course.CreatedAt,
        UpdatedAt = course.UpdatedAt,
        SubmittedAt = course.SubmittedAt,
        ApprovedAt = course.ApprovedAt,
        ApprovedById = course.ApprovedById,
        ApprovedByName = course.ApprovedBy?.FullName,
        SubmissionNote = course.SubmissionNote,
        RejectionReason = course.RejectionReason,
    };

    // -------------------------------------------------------------------------
    // Build a reusable, filterable IQueryable for Course
    // -------------------------------------------------------------------------
    private IQueryable<Course> BuildCourseQuery(int? instructorId, string? status, int? categoryId, string? search)
    {
        var query = _courseRepository.GetQueryable()
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .Include(c => c.ApprovedBy)
            .AsQueryable();

        // Filter by instructor (for instructor's own courses view)
        if (instructorId.HasValue)
            query = query.Where(c => c.InstructorId == instructorId.Value);

        // Filter by status (convert string → enum for comparison)
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<CourseStatus>(status, true, out var parsedStatus))
            query = query.Where(c => c.Status == parsedStatus);

        // Filter by category
        if (categoryId.HasValue)
            query = query.Where(c => c.CategoryId == categoryId.Value);

        // Full-text search on Title
        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Title.ToLower().Contains(search.ToLower()));

        return query.OrderByDescending(c => c.UpdatedAt);
    }

    // -------------------------------------------------------------------------
    // GET Instructor's own courses (paginated)
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetInstructorCoursesAsync(
       int instructorId, int page, int limit, string? status, int? categoryId, string? search)
    {
        var query = BuildCourseQuery(instructorId, status, categoryId, search);
        return await ExecutePaginatedQueryAsync(query, page, limit);
    }
    // -------------------------------------------------------------------------
    // Execute pagination — shared between both list methods
    // -------------------------------------------------------------------------
    private static async Task<CourseListResponse> ExecutePaginatedQueryAsync(
        IQueryable<Course> query, int page, int limit)
    {
        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return new CourseListResponse
        {
            Data = items.Select(MapToDto).ToList(),
            Pagination = new PaginationMeta
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        };
    }

    // -------------------------------------------------------------------------
    // GET All courses — Admin only
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetAllCoursesAsync(
        int page, int limit, string? status, int? categoryId, string? search)
    {
        var query = BuildCourseQuery(null, status, categoryId, search);
        if (string.IsNullOrEmpty(status))
        {
            query = query.Where(c => c.Status != CourseStatus.DRAFT);
        }
        return await ExecutePaginatedQueryAsync(query, page, limit);
    }

    // -------------------------------------------------------------------------
    // Execute pagination — shared between both list methods
    // -------------------------------------------------------------------------
    private static CourseListResponse ExecutePaginatedList(
        IEnumerable<Course> source, int page, int limit)
    {
        var list = source.ToList();
        var total = list.Count;
        var items = list
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return new CourseListResponse
        {
            Data = items.Select(MapToDto).ToList(),
            Pagination = new PaginationMeta
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        };
    }

    // -------------------------------------------------------------------------
    // GET single course by ID
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> GetCourseByIdAsync(int courseId)
    {
        var course = await _courseRepository.GetQueryable()
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .Include(c => c.ApprovedBy)
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

        return course is null ? null : MapToDto(course);
    }

    // -------------------------------------------------------------------------
    // CREATE course
    // -------------------------------------------------------------------------
    private async Task ValidateCourseForApprovalAsync(int courseId, Course course)
    {
        var missingRequirements = new List<string>();

        ValidatePricing(course.IsFree, course.Price);

        if (string.IsNullOrWhiteSpace(course.Title))
            missingRequirements.Add("Tên khóa học");

        if (!course.CategoryId.HasValue || course.CategoryId.Value <= 0)
            missingRequirements.Add("Danh mục khóa học");

        if (string.IsNullOrWhiteSpace(course.Description))
            missingRequirements.Add("Mô tả khóa học");

        var lessons = await _lessonRepository.GetQueryable()
            .Where(lesson => lesson.CourseId == courseId)
            .Select(lesson => new { lesson.LessonId, lesson.Title, lesson.LessonType })
            .ToListAsync();

        // Speaking assignments are learner-submitted exercises, not video lessons.
        // They must not require an instructor-uploaded lesson video to submit the course for approval.
        var videoLessons = lessons
            .Where(lesson => lesson.LessonType != LessonType.ASSIGNMENT)
            .ToList();

        if (videoLessons.Count > 0)
        {
            var lessonIds = videoLessons.Select(lesson => lesson.LessonId).ToList();
            var lessonsWithVideo = await _materialRepository.GetQueryable()
                .Where(material => material.LessonId.HasValue
                    && lessonIds.Contains(material.LessonId.Value)
                    && material.MaterialType == MaterialType.VIDEO
                    && ((material.ObjectKey != null && material.ObjectKey.Trim() != "")
                        || (material.FileUrl != null && material.FileUrl.Trim() != "")))
                .Select(material => material.LessonId!.Value)
                .Distinct()
                .ToListAsync();

            var missingVideos = videoLessons
                .Where(lesson => !lessonsWithVideo.Contains(lesson.LessonId))
                .Select(lesson => lesson.Title)
                .ToList();

            if (missingVideos.Count > 0)
                missingRequirements.Add($"Video cho bài học: {string.Join(", ", missingVideos)}");
        }

        var hasModules = await _moduleRepository.AnyAsync(m => m.CourseId == courseId);
        if (!hasModules)
            missingRequirements.Add("Chương học (Module)");

        var hasLessons = await _lessonRepository.AnyAsync(l => l.CourseId == courseId);
        if (!hasLessons)
            missingRequirements.Add("Bài học (Lesson)");

        var hasSpeakingAssignment = await _lessonRepository.AnyAsync(l => l.CourseId == courseId && l.LessonType == LessonType.ASSIGNMENT);
        if (!hasSpeakingAssignment)
            missingRequirements.Add("Bài tập nói cuối khóa (Speaking Assignment)");

        if (missingRequirements.Any())
        {
            throw new InvalidOperationException($"Chưa thể gửi Admin duyệt. Khóa học còn thiếu: {string.Join(", ", missingRequirements)}.");
        }
    }

    public async Task<CourseDto?> CreateCourseAsync(int instructorId, CreateCourseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
            throw new InvalidOperationException("Tên khóa học phải có ít nhất 3 ký tự.");

        var isFree = request.IsFree ?? request.Price <= 0;
        var price = isFree ? 0 : request.Price;
        ValidatePricing(isFree, price);

        // Validate the CategoryId FK if provided. If not exists, set to null instead of failing completely.
        if (request.CategoryId.HasValue)
        {
            var catExists = await _categoryRepository.AnyAsync(c => c.CategoryId == request.CategoryId.Value);
            if (!catExists)
            {
                request.CategoryId = null; // Default to unassigned category if invalid CategoryId provided
            }
        }

        if (request.SubmitForApproval)
        {
            throw new InvalidOperationException("Khóa học mới tạo chưa có Chương học và Bài học. Hãy tạo khóa học trước, sau đó thêm Chương & Bài học đầy đủ mới có thể gửi Admin duyệt.");
        }

        // Force new/imported course status to DRAFT regardless of client request (must be approved by Admin to publish)
        var status = CourseStatus.DRAFT;

        var course = new Course
        {
            InstructorId = instructorId,
            CategoryId = request.CategoryId,
            Title = request.Title,
            Slug = GenerateSlug(request.Title),
            Description = request.Description,
            ThumbnailUrl = request.ThumbnailUrl,
            Price = price,
            IsFree = isFree,
            Level = request.Level,
            Status = status,
            SubmissionNote = request.SubmissionNote,
            SubmittedAt = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _courseRepository.AddAsync(course);
        await _unitOfWork.SaveChangesAsync();

        // Reload with includes so the returned DTO has CategoryName/InstructorName
        return await GetCourseByIdAsync(course.CourseId);
    }

    // -------------------------------------------------------------------------
    // UPDATE course (partial — only updates non-null fields)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseAsync(int courseId, int instructorId, UpdateCourseRequest request)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);

        // 404 or 403: not found OR caller is not the owner
        if (course is null || course.InstructorId != instructorId)
            return null;

        if (course.Status == CourseStatus.ARCHIVED)
            throw new InvalidOperationException("Khóa học đã lưu trữ nên không thể chỉnh sửa hoặc gửi duyệt lại.");
        if (await _courseDeletionRequestRepository.GetQueryable()
                .AnyAsync(deletionRequest => deletionRequest.CourseId == courseId && deletionRequest.Status == "PENDING"))
            throw new InvalidOperationException("Khóa học đang có yêu cầu xóa chờ Admin xử lý.");
        if (course.Status == CourseStatus.PUBLISHED && request.Status.HasValue && request.Status.Value != CourseStatus.PUBLISHED)
            throw new InvalidOperationException("Khóa học đã xuất bản chỉ có thể được lưu trữ qua thao tác quản lý trạng thái.");

        // Apply only the fields that the client explicitly sent
        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
                throw new InvalidOperationException("Tên khóa học phải có ít nhất 3 ký tự.");

            course.Title = request.Title;
            course.Slug = GenerateSlug(request.Title); // Re-generate slug when title changes
        }
        if (request.Description is not null) course.Description = request.Description;
        if (request.CategoryId.HasValue) course.CategoryId = request.CategoryId;
        if (request.ThumbnailUrl is not null) course.ThumbnailUrl = request.ThumbnailUrl;
        if (request.Price.HasValue) course.Price = request.Price.Value;
        if (request.IsFree.HasValue) course.IsFree = request.IsFree.Value;
        if (course.IsFree)
            course.Price = 0;
        ValidatePricing(course.IsFree, course.Price);
        if (request.Level.HasValue) course.Level = request.Level;
        if (request.Status.HasValue)
        {
            // Instructors cannot directly publish courses; any edit defaults to DRAFT unless submitted for approval
            course.Status = request.Status.Value == CourseStatus.PUBLISHED ? CourseStatus.DRAFT : request.Status.Value;
        }

        if (request.SubmitForApproval || (request.Status.HasValue && request.Status.Value == CourseStatus.PENDING_APPROVAL))
        {
            await ValidateCourseForApprovalAsync(courseId, course);
            course.Status = CourseStatus.PENDING_APPROVAL;
            course.SubmittedAt = DateTime.UtcNow;
            if (request.SubmissionNote is not null)
                course.SubmissionNote = request.SubmissionNote;
        }

        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    private static void ValidatePricing(bool isFree, decimal price)
    {
        if (isFree && price != 0)
            throw new InvalidOperationException("Khóa miễn phí phải có học phí bằng 0 VNĐ.");

        if (!isFree && price <= 0)
            throw new InvalidOperationException("Khóa trả phí bắt buộc có học phí lớn hơn 0 VNĐ.");

        if (price != decimal.Truncate(price))
            throw new InvalidOperationException("Học phí VND phải là số nguyên.");
    }

    // -------------------------------------------------------------------------
    // DELETE course
    // -------------------------------------------------------------------------
    public async Task<CourseDeletionActionDto?> DeleteCourseAsync(int courseId, int instructorId)
    {
        CourseDeletionActionDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var course = await _courseRepository.GetByIdAsync(courseId);
            if (course is null || course.InstructorId != instructorId)
                return;

            if (course.Status != CourseStatus.DRAFT)
                throw new InvalidOperationException("Khóa học đã gửi duyệt hoặc từng được công khai. Hãy gửi yêu cầu Admin duyệt xóa.");
            if (await HasLearnerOrPaymentHistoryAsync(courseId))
                throw new InvalidOperationException("Khóa học có lịch sử học tập hoặc thanh toán nên không thể xóa trực tiếp. Hãy gửi yêu cầu Admin xem xét; dữ liệu sẽ được lưu trữ.");

            await DeleteCourseAndQueueStorageAsync(course);
            result = new CourseDeletionActionDto
            {
                CourseId = courseId,
                Action = "DELETED",
                Message = "Đã xóa khóa học nháp và lên lịch dọn các file R2 liên quan.",
            };
        });
        return result;
    }

    public async Task<CourseDeletionActionDto?> RequestCourseDeletionAsync(int courseId, int instructorId, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Vui lòng nhập lý do yêu cầu xóa khóa học.");

        CourseDeletionActionDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var course = await _courseRepository.GetByIdAsync(courseId);
            if (course is null || course.InstructorId != instructorId)
                return;

            var existingRequest = await _courseDeletionRequestRepository.GetQueryable()
                .FirstOrDefaultAsync(request => request.CourseId == courseId && request.Status == "PENDING");
            if (existingRequest is not null)
            {
                result = new CourseDeletionActionDto
                {
                    CourseId = courseId,
                    RequestId = existingRequest.RequestId,
                    Action = "REQUEST_ALREADY_PENDING",
                    Message = "Yêu cầu xóa khóa học này đã được gửi và đang chờ Admin xem xét.",
                };
                return;
            }

            // A truly unused draft needs no moderation. All other courses use the auditable review flow.
            if (course.Status == CourseStatus.DRAFT && !await HasLearnerOrPaymentHistoryAsync(courseId))
            {
                await DeleteCourseAndQueueStorageAsync(course);
                result = new CourseDeletionActionDto
                {
                    CourseId = courseId,
                    Action = "DELETED",
                    Message = "Đã xóa khóa học nháp và lên lịch dọn các file R2 liên quan.",
                };
                return;
            }

            course.Status = CourseStatus.ARCHIVED;
            course.UpdatedAt = DateTime.UtcNow;
            _courseRepository.Update(course);

            var instructor = await _userRepository.GetByIdAsync(instructorId);
            var request = new CourseDeletionRequest
            {
                CourseId = course.CourseId,
                CourseTitle = course.Title,
                InstructorId = instructorId,
                InstructorName = instructor?.FullName ?? $"Instructor #{instructorId}",
                Reason = reason.Trim(),
                Status = "PENDING",
                RequestedAt = DateTime.UtcNow,
            };
            await _courseDeletionRequestRepository.AddAsync(request);

            result = new CourseDeletionActionDto
            {
                CourseId = courseId,
                RequestId = request.RequestId,
                Action = "REQUEST_SUBMITTED",
                Message = "Khóa học đã được lưu trữ để dừng đăng ký mới. Học viên hiện tại vẫn giữ quyền học; yêu cầu xóa vĩnh viễn đã gửi Admin duyệt.",
            };
        });
        return result;
    }

    public async Task<CourseDeletionRequestListDto> GetPendingCourseDeletionRequestsAsync(int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _courseDeletionRequestRepository.GetQueryable()
            .Where(request => request.Status == "PENDING");
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(request => request.RequestedAt)
            .ThenBy(request => request.RequestId)
            .Select(request => new CourseDeletionRequestDto
            {
                RequestId = request.RequestId,
                CourseId = request.CourseId,
                CourseTitle = request.CourseTitle,
                InstructorId = request.InstructorId,
                InstructorName = request.InstructorName,
                Reason = request.Reason,
                Status = request.Status,
                RequestedAt = request.RequestedAt,
                EnrollmentCount = _enrollmentRepository.GetQueryable().Count(enrollment => enrollment.CourseId == request.CourseId),
                PaymentItemCount = _paymentItemRepository.GetQueryable().Count(item => item.CourseId == request.CourseId),
                SpeakingSubmissionCount = _speakingSubmissionRepository.GetQueryable().Count(submission =>
                    _lessonRepository.GetQueryable().Any(lesson => lesson.CourseId == request.CourseId && lesson.LessonId == submission.LessonId)),
                QuizAttemptCount = _quizAttemptRepository.GetQueryable().Count(attempt =>
                    _quizRepository.GetQueryable().Any(quiz => quiz.QuizId == attempt.QuizId && quiz.CourseId == request.CourseId)),
            })
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new CourseDeletionRequestListDto { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<CourseDeletionActionDto?> ReviewCourseDeletionRequestAsync(
        long requestId, int adminId, bool approve, string? adminNote)
    {
        CourseDeletionActionDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var request = await _courseDeletionRequestRepository.GetByIdAsync(requestId);
            if (request is null)
                return;
            if (request.Status != "PENDING")
                throw new InvalidOperationException("Yêu cầu này đã được Admin xử lý.");

            if (!approve)
            {
                if (string.IsNullOrWhiteSpace(adminNote))
                    throw new InvalidOperationException("Cần nhập lý do từ chối yêu cầu.");
                request.Status = "REJECTED";
                request.AdminNote = adminNote.Trim();
                request.ReviewedById = adminId;
                request.ReviewedAt = DateTime.UtcNow;
                _courseDeletionRequestRepository.Update(request);
                result = new CourseDeletionActionDto
                {
                    CourseId = request.CourseId,
                    RequestId = requestId,
                    Action = "REQUEST_REJECTED",
                    Message = "Đã từ chối yêu cầu. Khóa học tiếp tục được lưu trữ; dữ liệu học tập và tài chính được giữ lại.",
                };
                return;
            }

            var course = await _courseRepository.GetByIdAsync(request.CourseId);
            if (course is not null && await HasLearnerOrPaymentHistoryAsync(course.CourseId))
                throw new InvalidOperationException("Không thể xóa vĩnh viễn vì khóa học đã có học viên, giao dịch hoặc kết quả học tập. Khóa học vẫn được lưu trữ để bảo toàn lịch sử.");

            if (course is not null)
                await DeleteCourseAndQueueStorageAsync(course);

            request.Status = "APPROVED";
            request.AdminNote = string.IsNullOrWhiteSpace(adminNote) ? null : adminNote.Trim();
            request.ReviewedById = adminId;
            request.ReviewedAt = DateTime.UtcNow;
            _courseDeletionRequestRepository.Update(request);
            result = new CourseDeletionActionDto
            {
                CourseId = request.CourseId,
                RequestId = requestId,
                Action = "DELETED",
                Message = course is null ? "Khóa học đã được xóa trước đó; đã đóng yêu cầu." : "Admin đã duyệt xóa. Bản ghi đã xóa; các file R2 được đưa vào hàng đợi dọn nền.",
            };
        });
        return result;
    }

    private async Task<bool> HasLearnerOrPaymentHistoryAsync(int courseId)
    {
        if (await _enrollmentRepository.GetQueryable().AnyAsync(enrollment => enrollment.CourseId == courseId))
            return true;
        if (await _paymentItemRepository.GetQueryable().AnyAsync(item => item.CourseId == courseId))
            return true;
        if (await _speakingSubmissionRepository.GetQueryable().AnyAsync(submission =>
                _lessonRepository.GetQueryable().Any(lesson => lesson.CourseId == courseId && lesson.LessonId == submission.LessonId)))
            return true;
        if (await _lessonProgressRepository.GetQueryable().AnyAsync(progress =>
                _lessonRepository.GetQueryable().Any(lesson => lesson.CourseId == courseId && lesson.LessonId == progress.LessonId)))
            return true;
        return await _quizAttemptRepository.GetQueryable().AnyAsync(attempt =>
            _quizRepository.GetQueryable().Any(quiz => quiz.QuizId == attempt.QuizId && quiz.CourseId == courseId));
    }

    private async Task DeleteCourseAndQueueStorageAsync(Course course)
    {
        var courseId = course.CourseId;
        var now = DateTime.UtcNow;
        var objectDeletionTimes = new Dictionary<string, DateTime>(StringComparer.Ordinal);

        void AddObjectKey(string? key, DateTime? notBefore = null)
        {
            if (string.IsNullOrWhiteSpace(key)) return;
            var scheduledAt = notBefore ?? now;
            if (!objectDeletionTimes.TryGetValue(key, out var current) || scheduledAt > current)
                objectDeletionTimes[key] = scheduledAt;
        }

        var materials = await _materialRepository.GetQueryable()
            .Where(material => material.CourseId == courseId ||
                (material.LessonId.HasValue && _lessonRepository.GetQueryable()
                    .Any(lesson => lesson.CourseId == courseId && lesson.LessonId == material.LessonId.Value)))
            .Select(material => new { material.ObjectKey, material.FileUrl })
            .ToListAsync();
        foreach (var material in materials)
            AddObjectKey(material.ObjectKey ?? _r2.ExtractKeyFromUrl(material.FileUrl));

        var subtitles = await _lessonRepository.GetQueryable()
            .Where(lesson => lesson.CourseId == courseId)
            .Select(lesson => new { lesson.SubtitleObjectKey, lesson.SubtitleUrl })
            .ToListAsync();
        foreach (var subtitle in subtitles)
            AddObjectKey(subtitle.SubtitleObjectKey ?? _r2.ExtractKeyFromUrl(subtitle.SubtitleUrl ?? string.Empty));

        var sessions = await _videoUploadSessionRepository.GetQueryable()
            .Where(session => session.CourseId == courseId)
            .Select(session => new { session.ObjectKey, session.Status, session.ExpiresAt })
            .ToListAsync();
        foreach (var session in sessions)
            AddObjectKey(session.ObjectKey, session.Status == "PENDING" ? session.ExpiresAt.AddMinutes(5) : now);

        var jobs = objectDeletionTimes.Select(entry => new R2ObjectDeletionJob
        {
            SourceCourseId = courseId,
            ObjectKey = entry.Key,
            Status = "PENDING",
            CreatedAt = now,
            NextAttemptAt = entry.Value,
        }).ToList();
        if (jobs.Count > 0)
            await _r2DeletionJobRepository.AddRangeAsync(jobs);

        _courseRepository.Remove(course);
    }

    // -------------------------------------------------------------------------
    // PATCH status (quick toggle from table row)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseStatusAsync(int courseId, int currentUserId, string newStatus, string? reason = null)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != currentUserId)
            return null;

        if (!Enum.TryParse<CourseStatus>(newStatus, true, out var parsedStatus))
            return null; // Invalid status string

        if (parsedStatus == CourseStatus.PUBLISHED)
            throw new InvalidOperationException("Chỉ Admin mới có thể xuất bản khóa học.");
        if (course.Status == CourseStatus.PUBLISHED && parsedStatus != CourseStatus.ARCHIVED)
            throw new InvalidOperationException("Khóa học đã xuất bản chỉ có thể được lưu trữ; không thể chuyển lại thành bản nháp.");
        if (course.Status == CourseStatus.ARCHIVED)
            throw new InvalidOperationException("Khóa học đã lưu trữ không thể đổi trạng thái trực tiếp.");
        if (parsedStatus == CourseStatus.ARCHIVED && course.Status != CourseStatus.PUBLISHED)
            throw new InvalidOperationException("Chỉ khóa học đã xuất bản mới có thể được lưu trữ bằng thao tác này.");
        if (await _courseDeletionRequestRepository.GetQueryable()
                .AnyAsync(request => request.CourseId == courseId && request.Status == "PENDING"))
            throw new InvalidOperationException("Khóa học đang có yêu cầu xóa chờ Admin xử lý.");

        if (parsedStatus == CourseStatus.PENDING_APPROVAL)
        {
            await ValidateCourseForApprovalAsync(courseId, course);
            course.SubmittedAt = DateTime.UtcNow;
        }
        else if (parsedStatus == CourseStatus.PUBLISHED)
        {
            course.ApprovedAt = DateTime.UtcNow;
            course.ApprovedById = currentUserId;
            course.RejectionReason = null;
        }
        else if (parsedStatus == CourseStatus.REJECTED)
        {
            course.ApprovedAt = DateTime.UtcNow;
            course.ApprovedById = currentUserId;
            if (!string.IsNullOrEmpty(reason))
                course.RejectionReason = reason;
        }

        course.Status = parsedStatus;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Submit for Admin Approval
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> SubmitForApprovalAsync(int courseId, int instructorId, string? submissionNote)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return null;

        if (course.Status == CourseStatus.PUBLISHED || course.Status == CourseStatus.ARCHIVED ||
            await _courseDeletionRequestRepository.GetQueryable()
                .AnyAsync(deletionRequest => deletionRequest.CourseId == courseId && deletionRequest.Status == "PENDING"))
            throw new InvalidOperationException("Khóa học đã công khai, lưu trữ hoặc đang có yêu cầu xóa nên không thể gửi duyệt lại.");

        await ValidateCourseForApprovalAsync(courseId, course);

        course.Status = CourseStatus.PENDING_APPROVAL;
        course.SubmittedAt = DateTime.UtcNow;
        if (submissionNote is not null)
            course.SubmissionNote = submissionNote;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Approve Course
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> ApproveCourseAsync(int courseId, int adminId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (course.Status != CourseStatus.PENDING_APPROVAL ||
            await _courseDeletionRequestRepository.GetQueryable()
                .AnyAsync(deletionRequest => deletionRequest.CourseId == courseId && deletionRequest.Status == "PENDING"))
            throw new InvalidOperationException("Chỉ khóa học đang chờ duyệt mới có thể xuất bản.");

        course.Status = CourseStatus.PUBLISHED;
        course.ApprovedAt = DateTime.UtcNow;
        course.ApprovedById = adminId;
        course.RejectionReason = null;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Reject Course
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> RejectCourseAsync(int courseId, int adminId, string reason)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        course.Status = CourseStatus.REJECTED;
        course.ApprovedAt = DateTime.UtcNow;
        course.ApprovedById = adminId;
        course.RejectionReason = reason;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    /// <summary>
    /// Reopens an archived course as a draft. Archived courses can originate from different prior
    /// statuses, so restoring to draft avoids accidentally republishing unreviewed content.
    /// Any pending deletion request is closed as rejected in the same transaction.
    /// </summary>
    public async Task<CourseDto?> RestoreArchivedCourseAsync(int courseId, int adminId)
    {
        CourseDto? result = null;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var course = await _courseRepository.GetByIdAsync(courseId);
            if (course is null)
                return;

            if (course.Status != CourseStatus.ARCHIVED)
                throw new InvalidOperationException("Chỉ có thể khôi phục khóa học đang lưu trữ.");

            var pendingDeletionRequest = await _courseDeletionRequestRepository.GetQueryable()
                .FirstOrDefaultAsync(request => request.CourseId == courseId && request.Status == "PENDING");
            if (pendingDeletionRequest is not null)
            {
                pendingDeletionRequest.Status = "REJECTED";
                pendingDeletionRequest.AdminNote = "Admin đã khôi phục khóa học về bản nháp.";
                pendingDeletionRequest.ReviewedById = adminId;
                pendingDeletionRequest.ReviewedAt = DateTime.UtcNow;
                _courseDeletionRequestRepository.Update(pendingDeletionRequest);
            }

            course.Status = CourseStatus.DRAFT;
            course.UpdatedAt = DateTime.UtcNow;
            _courseRepository.Update(course);
            await _unitOfWork.SaveChangesAsync();

            result = await GetCourseByIdAsync(courseId);
        });

        return result;
    }

    // -------------------------------------------------------------------------
    // BULK CREATE courses
    // -------------------------------------------------------------------------
    public async Task<List<CourseDto>> CreateCoursesBulkAsync(int instructorId, List<CreateCourseRequest> requests)
    {
        var createdList = new List<CourseDto>();
        foreach (var req in requests)
        {
            req.Status = CourseStatus.DRAFT;
            req.SubmitForApproval = false;
            var created = await CreateCourseAsync(instructorId, req);
            if (created != null)
            {
                createdList.Add(created);
            }
        }
        return createdList;
    }

    // -------------------------------------------------------------------------
    // GET Learned Courses (for enrolled learner)
    // -------------------------------------------------------------------------
    public async Task<List<LearnedCourseDto>> GetLearnedCoursesAsync(int learnerId)
    {
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && (e.Status == "ACTIVE" || e.Status == "COMPLETED" || e.Status == "EXPIRED"),
            e => e.Course,
            e => e.Course.Category,
            e => e.Course.Instructor,
            e => e.LessonProgresses);

        var result = new List<LearnedCourseDto>();
        var giftManagedAccess = await _giftAccess.GetManagedCourseAccessAsync(
            learnerId, enrollments.Select(e => e.CourseId).Distinct().ToArray(), DateTime.UtcNow);

        foreach (var enrollment in enrollments.OrderByDescending(e => e.UpdatedAt))
        {
            if (enrollment.Course == null) continue;
            if (giftManagedAccess.TryGetValue(enrollment.CourseId, out var hasGiftManagedAccess) && !hasGiftManagedAccess)
                continue;

            var courseDto = MapToDto(enrollment.Course);

            var lessons = await _lessonRepository.FindAsync(
                l => l.CourseId == enrollment.CourseId && l.Status == LessonStatus.ACTIVE);
            var totalLessonsCount = lessons.Count();

            var progressList = enrollment.LessonProgresses ?? new List<LessonProgress>();
            var completedProgresses = progressList.Where(p => p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED).ToList();
            var completedCount = completedProgresses.Count;

            // Lấy tiến độ chuẩn xác từ ILearningProgressService (tính đồng bộ Lessons + Quizzes)
            var progress = await _learningProgressService.GetCourseProgressAsync(learnerId, enrollment.CourseId);

            decimal progressPercent = progress?.CompletionPercentage ?? (totalLessonsCount > 0
                ? Math.Round((decimal)completedCount / totalLessonsCount * 100, 2)
                : Convert.ToDecimal(enrollment.CompletionPercentage));

            var lastProgress = progressList.OrderByDescending(p => p.LastAccessedAt ?? p.UpdatedAt).FirstOrDefault();
            string? lastLectureTitle = null;
            if (lastProgress != null)
            {
                var lastLesson = lessons.FirstOrDefault(l => l.LessonId == lastProgress.LessonId);
                lastLectureTitle = lastLesson?.Title;
            }

            var certs = await _certificateRepository.FindAsync(c => c.EnrollmentId == enrollment.EnrollmentId);
            var cert = certs.FirstOrDefault();

            bool isCompleted = progress?.IsCompleted ?? (progressPercent >= 100m && cert != null);

            result.Add(new LearnedCourseDto
            {
                EnrollmentId = enrollment.EnrollmentId,
                CourseId = enrollment.CourseId,
                Course = courseDto,
                ProgressPercent = progressPercent,
                CompletedLecturesCount = progress?.CompletedLessonsCount ?? completedCount,
                TotalLecturesCount = progress?.TotalLessonsCount ?? totalLessonsCount,
                LastAccessedAt = lastProgress?.LastAccessedAt ?? enrollment.UpdatedAt,
                LastLectureTitle = lastLectureTitle,
                Status = isCompleted ? "completed" : "in-progress",
                EnrolledDate = enrollment.EnrolledAt ?? enrollment.CreatedAt,
                CertificateId = cert?.CertificateId ?? progress?.CertificateId
            });
        }

        return result;
    }
}


