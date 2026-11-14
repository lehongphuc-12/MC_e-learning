using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Owns syllabus upload, immutable version history and role-aware document delivery.
/// R2 stores private objects; PostgreSQL stores only object keys and review metadata.
/// </summary>
public sealed class CourseSyllabusService : ICourseSyllabusService
{
    private const long MaxSyllabusSizeBytes = 20L * 1024 * 1024;
    private static readonly TimeSpan UploadSessionLifetime = TimeSpan.FromMinutes(30);
    private static readonly IReadOnlyDictionary<string, string> SupportedFiles = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    private readonly IGenericRepository<Course> _courses;
    private readonly IGenericRepository<CourseSyllabusVersion> _versions;
    private readonly IGenericRepository<CourseSyllabusUploadSession> _sessions;
    private readonly IGenericRepository<Module> _modules;
    private readonly IGenericRepository<R2ObjectDeletionJob> _deletionJobs;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IR2StorageService _r2;
    private readonly ICourseLearningAccessService _courseAccess;

    public CourseSyllabusService(
        IGenericRepository<Course> courses,
        IGenericRepository<CourseSyllabusVersion> versions,
        IGenericRepository<CourseSyllabusUploadSession> sessions,
        IGenericRepository<Module> modules,
        IGenericRepository<R2ObjectDeletionJob> deletionJobs,
        IUnitOfWork unitOfWork,
        IR2StorageService r2,
        ICourseLearningAccessService courseAccess)
    {
        _courses = courses;
        _versions = versions;
        _sessions = sessions;
        _modules = modules;
        _deletionJobs = deletionJobs;
        _unitOfWork = unitOfWork;
        _r2 = r2;
        _courseAccess = courseAccess;
    }

    public async Task<SyllabusUploadSessionDto> CreateUploadSessionAsync(
        int courseId,
        int instructorId,
        CreateSyllabusUploadSessionRequest request)
    {
        var course = await _courses.GetByIdAsync(courseId)
            ?? throw new KeyNotFoundException("Không tìm thấy khóa học.");
        if (course.InstructorId != instructorId)
            throw new UnauthorizedAccessException("Bạn không có quyền tải syllabus lên khóa học này.");
        if (course.Status is CourseStatus.ARCHIVED or CourseStatus.PENDING_APPROVAL)
            throw new InvalidOperationException("Khóa học đang lưu trữ hoặc chờ duyệt nên không thể thay đổi syllabus.");

        var fileName = Path.GetFileName(request.FileName?.Trim() ?? string.Empty);
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (fileName.Length is < 1 or > 255 || !SupportedFiles.TryGetValue(extension, out var expectedContentType))
            throw new InvalidOperationException("Chỉ chấp nhận tài liệu PDF hoặc Word DOCX.");
        if (!string.Equals(request.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Loại nội dung tài liệu không khớp với phần mở rộng của file.");
        if (request.Size <= 0 || request.Size > MaxSyllabusSizeBytes)
            throw new InvalidOperationException("Syllabus phải có dung lượng từ 1 byte đến 20 MB.");

        var now = DateTime.UtcNow;
        var session = new CourseSyllabusUploadSession
        {
            SessionId = Guid.NewGuid(),
            CourseId = courseId,
            InstructorId = instructorId,
            ObjectKey = $"course-syllabi/{courseId}/staging/{Guid.NewGuid():N}{extension}",
            FileName = fileName,
            ContentType = expectedContentType,
            FileExtension = extension,
            ExpectedSize = request.Size,
            Status = "PENDING",
            CreatedAt = now,
            ExpiresAt = now.Add(UploadSessionLifetime),
        };

        await _sessions.AddAsync(session);
        await _unitOfWork.SaveChangesAsync();

        return new SyllabusUploadSessionDto
        {
            SessionId = session.SessionId,
            UploadUrl = _r2.GetPresignedPutUrl(session.ObjectKey, session.ContentType, 15),
            ContentType = session.ContentType,
            ExpiresAt = session.ExpiresAt,
        };
    }

    public async Task<CourseSyllabusVersionDto> CompleteUploadSessionAsync(int courseId, Guid sessionId, int instructorId)
    {
        var session = await _sessions.GetQueryable()
            .FirstOrDefaultAsync(item => item.SessionId == sessionId && item.CourseId == courseId);
        if (session is null || session.InstructorId != instructorId)
            throw new KeyNotFoundException("Phiên tải syllabus không tồn tại.");
        if (session.Status == "COMPLETED")
        {
            // ObjectKey is unique in both tables, so it is the durable idempotency link
            // between a completed upload session and its immutable syllabus revision.
            var completedVersion = await _versions.GetQueryable()
                .AsNoTracking()
                .FirstOrDefaultAsync(version => version.ObjectKey == session.ObjectKey && version.CourseId == courseId);
            if (completedVersion is not null)
                return Map(completedVersion);
            throw new InvalidOperationException("Phiên upload đã hoàn tất nhưng không tìm thấy phiên bản syllabus tương ứng.");
        }
        if (session.Status != "PENDING" || session.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("Phiên tải syllabus đã hết hạn. Hãy chọn file và tải lại.");

        var course = await _courses.GetByIdAsync(courseId)
            ?? throw new KeyNotFoundException("Không tìm thấy khóa học.");
        if (course.InstructorId != instructorId || course.Status is CourseStatus.ARCHIVED or CourseStatus.PENDING_APPROVAL)
            throw new InvalidOperationException("Khóa học hiện không thể nhận thay đổi syllabus.");

        var metadata = await _r2.GetObjectMetadataAsync(session.ObjectKey);
        if (metadata is null || metadata.Value.ContentLength != session.ExpectedSize)
            throw new InvalidOperationException("File chưa có trong kho hoặc kích thước tải lên không khớp.");

        await ValidateObjectSignatureAsync(session);

        CourseSyllabusVersion? createdVersion = null;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            // Serialize revision creation for this course. The unique course/revision index is
            // the final guard if two upload completions race.
            var existingVersions = await _versions.GetQueryable()
                .Where(version => version.CourseId == courseId)
                .OrderByDescending(version => version.VersionNumber)
                .ToListAsync();
            foreach (var current in existingVersions.Where(version => version.IsCurrent))
            {
                current.IsCurrent = false;
                _versions.Update(current);
            }

            var nextVersion = (existingVersions.FirstOrDefault()?.VersionNumber ?? 0) + 1;
            createdVersion = new CourseSyllabusVersion
            {
                CourseId = courseId,
                VersionNumber = nextVersion,
                ObjectKey = session.ObjectKey,
                OriginalFileName = session.FileName,
                ContentType = session.ContentType,
                FileExtension = session.FileExtension,
                FileSizeBytes = session.ExpectedSize,
                ReviewStatus = "DRAFT",
                IsCurrent = true,
                UploadedById = instructorId,
                UploadedAt = DateTime.UtcNow,
            };

            await _versions.AddAsync(createdVersion);
            session.Status = "COMPLETED";
            session.CompletedAt = DateTime.UtcNow;
            _sessions.Update(session);
            await _unitOfWork.SaveChangesAsync();
        });

        return Map(createdVersion!);
    }

    public async Task<CourseSyllabusVersionDto?> GetCurrentVersionAsync(int courseId, int instructorId, bool isAdmin)
    {
        var course = await _courses.GetByIdAsync(courseId);
        if (course is null || (!isAdmin && course.InstructorId != instructorId))
            return null;

        var current = await _versions.GetQueryable()
            .AsNoTracking()
            .Where(version => version.CourseId == courseId && version.IsCurrent)
            .FirstOrDefaultAsync();
        return current is null ? null : Map(current);
    }

    public async Task<CourseSyllabusVersionDto?> GetSubmittedVersionAsync(int courseId)
    {
        var course = await _courses.GetByIdAsync(courseId);
        if (course?.SubmittedSyllabusVersionId is not int versionId)
            return null;
        var version = await _versions.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.SyllabusVersionId == versionId && item.CourseId == courseId);
        return version is null ? null : Map(version);
    }

    public async Task<CourseSyllabusPublicOutlineDto?> GetPublicOutlineAsync(int courseId)
    {
        var course = await _courses.GetQueryable()
            .AsNoTracking()
            .Where(item => item.CourseId == courseId
                && (item.Status == CourseStatus.PUBLISHED
                    || (item.Status == CourseStatus.PENDING_APPROVAL && item.ApprovedSyllabusVersionId != null)))
            .Select(item => new { item.CourseId, item.Description, item.ApprovedSyllabusVersionId })
            .FirstOrDefaultAsync();
        if (course is null)
            return null;

        var modules = await _modules.GetQueryable()
            .AsNoTracking()
            .Where(module => module.CourseId == courseId)
            .OrderBy(module => module.OrderIndex)
            .Select(module => new CourseSyllabusPublicModuleDto
            {
                ModuleId = module.ModuleId,
                Title = module.Title,
                OrderIndex = module.OrderIndex,
                Lessons = module.Lessons
                    .Where(lesson => lesson.Status == LessonStatus.ACTIVE)
                    .OrderBy(lesson => lesson.OrderIndex)
                    .Select(lesson => new CourseSyllabusPublicLessonDto
                    {
                        LessonId = lesson.LessonId,
                        Title = lesson.Title,
                        DurationMinutes = lesson.DurationMinutes,
                        IsPreview = lesson.IsPreview,
                    }).ToList(),
            })
            .ToListAsync();

        var approvedVersion = course.ApprovedSyllabusVersionId.HasValue
            ? await _versions.GetQueryable()
                .Where(version => version.SyllabusVersionId == course.ApprovedSyllabusVersionId.Value)
                .Select(version => new { version.OriginalFileName, version.ContentType })
                .FirstOrDefaultAsync()
            : null;

        foreach (var module in modules)
            module.TotalDurationMinutes = module.Lessons.Sum(lesson => lesson.DurationMinutes);

        return new CourseSyllabusPublicOutlineDto
        {
            CourseId = course.CourseId,
            Description = course.Description ?? string.Empty,
            Modules = modules,
            FullSyllabusFileName = approvedVersion?.OriginalFileName,
            FullSyllabusVersionId = course.ApprovedSyllabusVersionId,
            FullSyllabusContentType = approvedVersion?.ContentType,
            HasFullSyllabus = course.ApprovedSyllabusVersionId.HasValue,
        };
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetVersionContentAsync(
        int courseId, int versionId, int userId, bool isAdmin, bool isInstructor)
    {
        var course = await _courses.GetByIdAsync(courseId);
        if (course is null)
            return null;

        var version = await _versions.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.SyllabusVersionId == versionId && item.CourseId == courseId);
        if (version is null)
            return null;

        var allowed = isAdmin
            || (isInstructor && course.InstructorId == userId)
            || (course.ApprovedSyllabusVersionId == versionId
                && await _courseAccess.CanAccessCourseAsync(courseId, userId, isAdmin: false));
        if (!allowed)
            throw new UnauthorizedAccessException("Bạn chưa có quyền xem tài liệu syllabus này.");

        var objectResult = await _r2.GetObjectStreamAsync(version.ObjectKey);
        if (objectResult is null)
            return null;
        return (objectResult.Value.Stream, version.ContentType, version.OriginalFileName);
    }

    public async Task<bool> DeleteDraftVersionAsync(int courseId, int versionId, int instructorId)
    {
        var course = await _courses.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return false;

        var version = await _versions.GetQueryable()
            .FirstOrDefaultAsync(item => item.SyllabusVersionId == versionId && item.CourseId == courseId);
        if (version is null)
            return false;
        if (version.ReviewStatus is not ("DRAFT" or "REJECTED")
            || (course.SubmittedSyllabusVersionId == versionId && version.ReviewStatus == "PENDING_APPROVAL")
            || course.ApprovedSyllabusVersionId == versionId)
            throw new InvalidOperationException("Chỉ có thể xóa phiên bản nháp hoặc bị từ chối chưa được dùng trong lần duyệt.");

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _deletionJobs.AddAsync(new R2ObjectDeletionJob
            {
                SourceCourseId = courseId,
                ObjectKey = version.ObjectKey,
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow,
                NextAttemptAt = DateTime.UtcNow,
            });
            _versions.Remove(version);

            if (version.IsCurrent)
            {
                var previous = await _versions.GetQueryable()
                    .Where(item => item.CourseId == courseId && item.SyllabusVersionId != versionId)
                    .OrderByDescending(item => item.VersionNumber)
                    .FirstOrDefaultAsync();
                if (previous is not null)
                {
                    previous.IsCurrent = true;
                    _versions.Update(previous);
                }
            }
            await _unitOfWork.SaveChangesAsync();
        });
        return true;
    }

    private async Task ValidateObjectSignatureAsync(CourseSyllabusUploadSession session)
    {
        var stored = await _r2.GetObjectStreamAsync(session.ObjectKey);
        if (stored is null)
            throw new InvalidOperationException("Không thể đọc file syllabus vừa tải lên.");

        await using var stream = stored.Value.Stream;
        var header = new byte[8];
        var bytesRead = await stream.ReadAsync(header.AsMemory(0, header.Length));
        var valid = session.FileExtension switch
        {
            ".pdf" => bytesRead >= 5 && header.AsSpan(0, 5).SequenceEqual("%PDF-"u8),
            ".docx" => bytesRead >= 4 && header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
            _ => false,
        };
        if (!valid)
            throw new InvalidOperationException("Nội dung file không đúng định dạng PDF hoặc DOCX hợp lệ.");
    }

    private static CourseSyllabusVersionDto Map(CourseSyllabusVersion version) => new()
    {
        SyllabusVersionId = version.SyllabusVersionId,
        CourseId = version.CourseId,
        VersionNumber = version.VersionNumber,
        OriginalFileName = version.OriginalFileName,
        ContentType = version.ContentType,
        FileExtension = version.FileExtension,
        FileSizeBytes = version.FileSizeBytes,
        ReviewStatus = version.ReviewStatus,
        IsCurrent = version.IsCurrent,
        UploadedAt = version.UploadedAt,
        SubmittedAt = version.SubmittedAt,
        ReviewedAt = version.ReviewedAt,
        ReviewedById = version.ReviewedById,
        ReviewNote = version.ReviewNote,
    };
}
