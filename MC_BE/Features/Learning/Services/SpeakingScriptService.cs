// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Implementation (Business Logic Layer - Speaking Scripts Domain).
// - Nằm trong module: Features/Learning/Services.
// - Triển khai từ: ISpeakingScriptService.
// - Vai trò: Trung tâm điều phối toàn bộ nghiệp vụ biên soạn, bóc tách tài liệu, cấu hình 3 cấp độ nói
//   (BEGINNER, INTERMEDIATE, ADVANCED) và quản lý 3 phạm vi đánh giá kịch bản (LESSON, CHAPTER, FINAL).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp bộ công cụ toàn diện cho Giảng viên:
//   1. Tải file Word/Text (.docx, .txt, .md), tự động bóc tách và xem trước cấu trúc (Direct Preview).
//   2. Lưu và xuất bản kịch bản cho bài học với cơ chế Fallback thông minh: nếu một cấp độ bị thiếu nội dung,
//      hệ thống tự động lấy nội dung có sẵn hoặc OriginalContent để bù đắp, không làm gãy giao diện học viên.
//   3. Tự động sinh CleanScriptForScoring (loại bỏ toàn bộ thẻ cử chỉ/ngắt nghỉ) để cấp cho AI chấm âm thanh.
//   4. Phân quyền tác giả chặt chẽ (Ownership Verification): Ngăn chặn giảng viên sửa kịch bản của khóa học khác.
//   5. Quản lý linh hoạt kịch bản ở 3 cấp độ phạm vi: Gắn vào bài học (LESSON), Kiểm tra chương (CHAPTER),
//      hoặc Thi tốt nghiệp cuối khóa (FINAL).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controllers: SpeakingScriptController.
// - Services phối hợp: SpeakingScriptParserService (Parser Engine in-memory).
// - Repositories: ISpeakingScriptRepository, IGenericRepository<Lesson>, IUnitOfWork.
// - Database: Tables SpeakingScripts, SpeakingScriptLevels, Lessons, Courses.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Lớp triển khai dịch vụ quản lý kịch bản luyện nói và bóc tách tài liệu.
/// </summary>
public class SpeakingScriptService : ISpeakingScriptService
{
    private readonly ISpeakingScriptRepository _scriptRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly SpeakingScriptParserService _parserService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly SmartMcDbContext _context;
    private readonly ILogger<SpeakingScriptService> _logger;

    /// <summary>
    /// Khởi tạo Service với các dependency được inject qua Constructor.
    /// </summary>
    public SpeakingScriptService(
        ISpeakingScriptRepository scriptRepository,
        IGenericRepository<Lesson> lessonRepository,
        SpeakingScriptParserService parserService,
        IUnitOfWork unitOfWork,
        SmartMcDbContext context,
        ILogger<SpeakingScriptService> logger)
    {
        _scriptRepository = scriptRepository;
        _lessonRepository = lessonRepository;
        _parserService = parserService;
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm bảo vệ phân quyền (Private Guard): Xác minh quyền sở hữu bài học của giảng viên.
    /// - End-to-End Flow: Nạp Lesson kèm Course -> Kiểm tra null -> So khớp Course.InstructorId với instructorId đăng nhập.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="instructorId">ID giảng viên lấy từ JWT Claims.</param>
    /// <returns>Thực thể Lesson nạp sẵn Course.</returns>
    /// <exception cref="KeyNotFoundException">Ném khi không tìm thấy bài học.</exception>
    /// <exception cref="UnauthorizedAccessException">Ném khi giảng viên không phải chủ khóa học.</exception>
    private async Task<Lesson> VerifyLessonOwnershipAsync(int lessonId, int instructorId)
    {
        // [BƯỚC 1]: Truy vấn bài học kèm thông tin Khóa học
        var lesson = await _context.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        // [BƯỚC 2]: Rẽ nhánh kiểm tra sự tồn tại của bài học
        // - Điều kiện: `lesson == null`.
        // - Trường hợp ĐÚNG (TRUE): Ném KeyNotFoundException dừng luồng ngay.
        if (lesson == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy bài học với ID {lessonId}.");
        }

        // [BƯỚC 3]: Rẽ nhánh kiểm tra quyền tác giả (IDOR Protection)
        // - Điều kiện: `lesson.Course.InstructorId != instructorId`.
        // - Trường hợp ĐÚNG (TRUE): Ném UnauthorizedAccessException, ngăn chặn hành vi sửa đổi tài nguyên trái phép.
        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý kịch bản cho khóa học này.");
        }

        return lesson;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm bảo vệ phân quyền (Private Guard): Xác minh quyền sở hữu khóa học của giảng viên.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <exception cref="KeyNotFoundException">Khi khóa học không tồn tại.</exception>
    /// <exception cref="UnauthorizedAccessException">Khi không có quyền.</exception>
    private async Task VerifyCourseOwnershipAsync(int courseId, int instructorId)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.CourseId == courseId);
        if (course == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy khóa học với ID {courseId}.");
        }

        if (course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý kịch bản cho khóa học này.");
        }
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Bóc tách trực tiếp file kịch bản không gắn với bài học nào, phục vụ công cụ xem trước nhanh.
    /// - End-to-End Flow: Gọi _parserService.ParseFileAsync(file) -> Ánh xạ kết quả sang ParsePreviewDto -> Sắp xếp Levels theo SpeakingLevel -> Trả về kết quả.
    /// </summary>
    /// <param name="file">File tải lên (.docx, .txt, .md).</param>
    /// <returns>ParsePreviewDto xem trước cấu trúc kịch bản.</returns>
    public async Task<ParsePreviewDto> ParseFileDirectAsync(IFormFile file)
    {
        var parseResult = await _parserService.ParseFileAsync(file);

        return new ParsePreviewDto
        {
            Success = parseResult.Success,
            Errors = parseResult.Errors,
            OriginalContent = parseResult.OriginalContent,
            Levels = parseResult.Levels.Values.Select(l => new LevelPreviewDto
            {
                Level = l.Level,
                Content = l.Content,
                CleanScriptForScoring = l.CleanScriptForScoring
            }).OrderBy(l => l.Level).ToList()
        };
    }

    /// <summary>
    /// Bóc tách file kịch bản cho một bài học cụ thể có kiểm tra quyền sở hữu của giảng viên.
    /// </summary>
    public async Task<ParsePreviewDto> ParseScriptFileAsync(int lessonId, IFormFile file, int instructorId)
    {
        await VerifyLessonOwnershipAsync(lessonId, instructorId);
        return await ParseFileDirectAsync(file);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lưu chính thức và xuất bản kịch bản cho bài học sau khi giảng viên đã xem trước và tinh chỉnh.
    /// - Hỗ trợ cả trường hợp Tạo mới (Insert) và Cập nhật (Upsert / Update).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Xác minh quyền giảng viên qua VerifyLessonOwnershipAsync.
    ///   - Bước 2: Tìm kịch bản hiện có của bài học qua _scriptRepository.GetByLessonIdAsync.
    ///   - Bước 3: Rẽ nhánh: Nếu chưa có kịch bản -> Khởi tạo mới SpeakingScript và danh sách Levels.
    ///   - Bước 4: Rẽ nhánh: Nếu đã có kịch bản -> Cập nhật các trường thông tin và cập nhật từng cấp độ con.
    ///   - Bước 5: Áp dụng cơ chế Fallback thông minh nếu có cấp độ bị để trống.
    ///   - Bước 6: Gọi SaveChangesAsync để lưu vào CSDL và trả về DTO đã nạp lại.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Dữ liệu kịch bản và 3 cấp độ.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>SpeakingScriptDto sau khi xuất bản.</returns>
    public async Task<SpeakingScriptDto> SaveAndPublishAsync(int lessonId, SaveScriptRequest request, int instructorId)
    {
        // [BƯỚC 1]: Kiểm tra quyền tác giả của giảng viên trên bài học
        var lesson = await VerifyLessonOwnershipAsync(lessonId, instructorId);

        // [BƯỚC 2]: Kiểm tra bài học đã có kịch bản trước đó chưa
        var existingScript = await _scriptRepository.GetByLessonIdAsync(lessonId);

        // ====================================================================================================
        // [BƯỚC 3]: RẼ NHÁNH TẠO MỚI KỊCH BẢN (INSERT FLOW - khi existingScript == null)
        // ====================================================================================================
        if (existingScript == null)
        {
            existingScript = new SpeakingScript
            {
                CourseId = lesson.CourseId,
                ModuleId = lesson.ModuleId,
                LessonId = lessonId,
                Scope = request.Scope,
                Title = request.Title.Trim(),
                OriginalContent = request.OriginalContent,
                PassingScore = request.PassingScore,
                CreatedBy = instructorId,
                Status = SpeakingScriptStatus.PUBLISHED,
                UpdatedAt = DateTime.UtcNow
            };

            // Cơ chế dự phòng (Fallback): Lấy nội dung của cấp độ đầu tiên có dữ liệu hoặc OriginalContent
            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? request.OriginalContent
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                existingScript.Levels.Add(new SpeakingScriptLevel
                {
                    Level = lvlDto.Level,
                    Content = contentToSave,
                    CleanScriptForScoring = cleanScoring,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _scriptRepository.AddAsync(existingScript);
        }
        // ====================================================================================================
        // [BƯỚC 4]: RẼ NHÁNH CẬP NHẬT KỊCH BẢN HIỆN CÓ (UPDATE / UPSERT FLOW - khi existingScript != null)
        // ====================================================================================================
        else
        {
            existingScript.CourseId = lesson.CourseId;
            existingScript.ModuleId = lesson.ModuleId;
            existingScript.Scope = request.Scope;
            existingScript.Title = request.Title.Trim();
            if (!string.IsNullOrWhiteSpace(request.OriginalContent))
            {
                existingScript.OriginalContent = request.OriginalContent;
            }
            if (request.PassingScore > 0)
            {
                existingScript.PassingScore = request.PassingScore;
            }
            existingScript.Status = SpeakingScriptStatus.PUBLISHED;
            existingScript.UpdatedAt = DateTime.UtcNow;

            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? existingScript.OriginalContent
                ?? existingScript.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                var existingLevel = existingScript.Levels.FirstOrDefault(l => l.Level == lvlDto.Level);
                if (existingLevel != null)
                {
                    existingLevel.Content = contentToSave;
                    existingLevel.CleanScriptForScoring = cleanScoring;
                    existingLevel.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    existingScript.Levels.Add(new SpeakingScriptLevel
                    {
                        ScriptId = existingScript.ScriptId,
                        Level = lvlDto.Level,
                        Content = contentToSave,
                        CleanScriptForScoring = cleanScoring,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _scriptRepository.Update(existingScript);
        }

        // [BƯỚC 5]: Lưu thay đổi vào CSDL
        await _unitOfWork.SaveChangesAsync();

        // [BƯỚC 6]: Tải lại dữ liệu mới nhất kèm đầy đủ quan hệ và trả về DTO
        var refreshed = await _scriptRepository.GetByLessonIdAsync(lessonId);
        return MapToDto(refreshed!);
    }

    /// <summary>
    /// Lấy kịch bản luyện nói gắn với một bài học cụ thể.
    /// </summary>
    public async Task<SpeakingScriptDto?> GetScriptByLessonAsync(int lessonId)
    {
        var script = await _scriptRepository.GetByLessonIdAsync(lessonId);
        return script == null ? null : MapToDto(script);
    }

    /// <summary>
    /// Lấy nội dung chi tiết của một cấp độ luyện nói cụ thể trong bài học (học viên bắt đầu luyện đọc).
    /// </summary>
    public async Task<SpeakingScriptLevelDto?> GetLevelContentAsync(int lessonId, SpeakingLevel level)
    {
        var scriptLevel = await _scriptRepository.GetLevelByLessonIdAsync(lessonId, level);
        if (scriptLevel == null) return null;

        return new SpeakingScriptLevelDto
        {
            LevelId = scriptLevel.LevelId,
            ScriptId = scriptLevel.ScriptId,
            Level = scriptLevel.Level.ToString(),
            Content = scriptLevel.Content,
            CleanScriptForScoring = scriptLevel.CleanScriptForScoring,
            UpdatedAt = scriptLevel.UpdatedAt
        };
    }

    /// <summary>
    /// Cập nhật riêng lẻ nội dung của một cấp độ kịch bản mà không cần gửi lại toàn bộ kịch bản.
    /// </summary>
    public async Task<SpeakingScriptDto?> UpdateLevelContentAsync(int scriptId, SpeakingLevel level, UpdateLevelContentRequest request, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null) return null;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        var scriptLevel = script.Levels.FirstOrDefault(l => l.Level == level);
        var cleanScoring = !string.IsNullOrWhiteSpace(request.CleanScriptForScoring)
            ? request.CleanScriptForScoring
            : _parserService.ExtractCleanScript(request.Content);

        if (scriptLevel != null)
        {
            scriptLevel.Content = request.Content.Trim();
            scriptLevel.CleanScriptForScoring = cleanScoring;
            scriptLevel.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            script.Levels.Add(new SpeakingScriptLevel
            {
                ScriptId = scriptId,
                Level = level,
                Content = request.Content.Trim(),
                CleanScriptForScoring = cleanScoring,
                UpdatedAt = DateTime.UtcNow
            });
        }

        script.UpdatedAt = DateTime.UtcNow;
        _scriptRepository.Update(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return MapToDto(refreshed!);
    }

    /// <summary>
    /// Xóa kịch bản nói gắn với một bài học.
    /// </summary>
    public async Task<bool> DeleteScriptAsync(int lessonId, int instructorId)
    {
        await VerifyLessonOwnershipAsync(lessonId, instructorId);

        var script = await _scriptRepository.GetByLessonIdAsync(lessonId);
        if (script == null) return false;

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // ====================================================================================================
    // CÁC PHƯƠNG THỨC MỞ RỘNG CHO HỆ THỐNG 3 SCOPE (LESSON, CHAPTER, FINAL)
    // ====================================================================================================

    /// <summary>
    /// Lấy danh sách kịch bản lọc theo nhiều tiêu chí động.
    /// </summary>
    public async Task<IEnumerable<SpeakingScriptDto>> GetAllScriptsAsync(
        int? courseId,
        SpeakingScope? scope,
        int? moduleId,
        int? lessonId,
        string? search)
    {
        var scripts = await _scriptRepository.GetAllWithDetailsAsync(courseId, scope, moduleId, lessonId, search);
        return scripts.Select(MapToDto);
    }

    /// <summary>
    /// Lấy chi tiết kịch bản theo ID.
    /// </summary>
    public async Task<SpeakingScriptDto?> GetScriptByIdAsync(int scriptId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return script == null ? null : MapToDto(script);
    }

    /// <summary>
    /// Lấy toàn bộ kịch bản thuộc một khóa học.
    /// </summary>
    public async Task<IEnumerable<SpeakingScriptDto>> GetScriptsByCourseAsync(int courseId)
    {
        var scripts = await _scriptRepository.GetByCourseIdAsync(courseId);
        return scripts.Select(MapToDto);
    }

    /// <summary>
    /// Tạo mới một kịch bản luyện nói độc lập (hỗ trợ cả Scope = CHAPTER và Scope = FINAL).
    /// </summary>
    public async Task<SpeakingScriptDto> CreateScriptAsync(CreateSpeakingScriptRequest request, int instructorId)
    {
        await VerifyCourseOwnershipAsync(request.CourseId, instructorId);

        var script = new SpeakingScript
        {
            CourseId = request.CourseId,
            Scope = request.Scope,
            ModuleId = request.Scope == SpeakingScope.CHAPTER ? request.ModuleId : (request.Scope == SpeakingScope.LESSON ? request.ModuleId : null),
            LessonId = request.Scope == SpeakingScope.LESSON ? request.LessonId : null,
            Title = request.Title.Trim(),
            OriginalContent = request.OriginalContent,
            PassingScore = request.PassingScore > 0 ? request.PassingScore : 80.00m,
            CreatedBy = instructorId,
            Status = SpeakingScriptStatus.PUBLISHED,
            UpdatedAt = DateTime.UtcNow
        };

        var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
            ?? request.OriginalContent
            ?? string.Empty;

        foreach (var lvlDto in request.Levels)
        {
            var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                ? lvlDto.Content.Trim()
                : validFallback.Trim();

            var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                ? lvlDto.CleanScriptForScoring
                : _parserService.ExtractCleanScript(contentToSave);

            script.Levels.Add(new SpeakingScriptLevel
            {
                Level = lvlDto.Level,
                Content = contentToSave,
                CleanScriptForScoring = cleanScoring,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _scriptRepository.AddAsync(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(script.ScriptId);
        return MapToDto(refreshed!);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật thông tin và cấp độ của một kịch bản theo ScriptId.
    /// - Quản lý cấu trúc rẽ nhánh Scope:
    ///   - Nếu Scope chuyển sang FINAL: Xóa ModuleId và LessonId (bài thi cấp toàn khóa).
    ///   - Nếu Scope là CHAPTER: Giữ ModuleId, xóa LessonId (bài thi cấp chương).
    ///   - Nếu Scope là LESSON: Giữ cả ModuleId và LessonId.
    /// </summary>
    public async Task<SpeakingScriptDto> UpdateScriptAsync(int scriptId, UpdateSpeakingScriptRequest request, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy kịch bản với ID {scriptId}.");
        }

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        if (request.CourseId.HasValue && request.CourseId.Value > 0)
        {
            await VerifyCourseOwnershipAsync(request.CourseId.Value, instructorId);
            script.CourseId = request.CourseId.Value;
        }

        if (request.Scope.HasValue)
        {
            script.Scope = request.Scope.Value;
            if (script.Scope == SpeakingScope.FINAL)
            {
                script.ModuleId = null;
                script.LessonId = null;
            }
            else if (script.Scope == SpeakingScope.CHAPTER)
            {
                script.ModuleId = request.ModuleId ?? script.ModuleId;
                script.LessonId = null;
            }
            else if (script.Scope == SpeakingScope.LESSON)
            {
                script.ModuleId = request.ModuleId ?? script.ModuleId;
                script.LessonId = request.LessonId ?? script.LessonId;
            }
        }
        else
        {
            if (request.ModuleId.HasValue) script.ModuleId = request.ModuleId.Value;
            if (request.LessonId.HasValue) script.LessonId = request.LessonId.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            script.Title = request.Title.Trim();
        }

        if (request.OriginalContent != null)
        {
            script.OriginalContent = request.OriginalContent;
        }

        if (request.PassingScore.HasValue && request.PassingScore.Value > 0)
        {
            script.PassingScore = request.PassingScore.Value;
        }

        script.UpdatedAt = DateTime.UtcNow;

        if (request.Levels != null && request.Levels.Count > 0)
        {
            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? script.OriginalContent
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                var existingLevel = script.Levels.FirstOrDefault(l => l.Level == lvlDto.Level);
                if (existingLevel != null)
                {
                    existingLevel.Content = contentToSave;
                    existingLevel.CleanScriptForScoring = cleanScoring;
                    existingLevel.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    script.Levels.Add(new SpeakingScriptLevel
                    {
                        ScriptId = script.ScriptId,
                        Level = lvlDto.Level,
                        Content = contentToSave,
                        CleanScriptForScoring = cleanScoring,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        _scriptRepository.Update(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return MapToDto(refreshed!);
    }

    /// <summary>
    /// Xóa kịch bản luyện nói theo ScriptId.
    /// </summary>
    public async Task<bool> DeleteScriptByIdAsync(int scriptId, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null) return false;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Ánh xạ thực thể SpeakingScript sang SpeakingScriptDto.
    /// </summary>
    private static SpeakingScriptDto MapToDto(SpeakingScript script)
    {
        var course = script.Course ?? script.Lesson?.Course;
        var module = script.Module ?? script.Lesson?.Module;

        return new SpeakingScriptDto
        {
            ScriptId = script.ScriptId,
            CourseId = script.CourseId != 0 ? script.CourseId : (course?.CourseId ?? 0),
            CourseTitle = course?.Title ?? string.Empty,
            Scope = script.Scope.ToString(),
            ModuleId = script.ModuleId ?? module?.ModuleId,
            ModuleTitle = module?.Title,
            LessonId = script.LessonId,
            LessonTitle = script.Lesson?.Title,
            Title = script.Title,
            OriginalContent = script.OriginalContent,
            PassingScore = script.PassingScore,
            CreatedBy = script.CreatedBy,
            CreatedByName = script.CreatedByUser?.FullName,
            Status = script.Status.ToString(),
            UpdatedAt = script.UpdatedAt,
            Levels = script.Levels.Select(l => new SpeakingScriptLevelDto
            {
                LevelId = l.LevelId,
                ScriptId = l.ScriptId,
                Level = l.Level.ToString(),
                Content = l.Content,
                CleanScriptForScoring = l.CleanScriptForScoring,
                UpdatedAt = l.UpdatedAt
            }).OrderBy(l => l.Level).ToList()
        };
    }
}
