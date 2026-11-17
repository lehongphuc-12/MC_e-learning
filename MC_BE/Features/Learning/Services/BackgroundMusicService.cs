// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Implementation (Tầng Dịch vụ nghiệp vụ - Business Logic Layer).
// - Nằm trong module: Features/Learning/Services.
// - Triển khai từ: IBackgroundMusicService.
// - Vai trò: Quản lý vòng đời và nghiệp vụ liên quan đến Nhạc nền (Background Music) cho các bài học nói/MC.
//   Đóng vai trò trung gian phối hợp giữa Cơ sở dữ liệu (SmartMcDbContext) và dịch vụ lưu trữ đám mây (CloudinaryService).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cho phép học viên nghe nhạc nền mẫu trong quá trình học và thu âm bài tập nói.
// - Cho phép giảng viên chủ nhiệm khóa học tải nhạc độc quyền cho bài giảng hoặc tải trước (Pre-upload) rồi liên kết hàng loạt.
// - Thực thi các quy tắc kiểm soát bảo mật và phân quyền nghiêm ngặt:
//   1. Giảng viên chỉ được tải/liên kết/xóa nhạc trên các bài học thuộc khóa học do chính mình giảng dạy (chống lỗ hổng IDOR).
//   2. Bảo vệ nhạc hệ thống (IsSystemDefault): Không ai được phép xóa nhạc nền mặc định thông qua API thông thường.
//   3. Dọn dẹp tài nguyên triệt để: Xóa bản ghi trong DB đồng thời gửi lệnh xóa file nhị phân trên Cloudinary qua CloudinaryPublicId.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Nhận yêu cầu từ: BackgroundMusicController.
// - Tương tác Database: SmartMcDbContext (DbSet BackgroundMusics, Lessons, Courses).
// - Tương tác Cloud: ICloudinaryService (UploadVideoAsync, DeleteFileAsync).
// - Kết quả trả về: BackgroundMusicDto, PreUploadMusicResultDto.
// ====================================================================================================

using CloudinaryDotNet.Actions;
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Lớp triển khai dịch vụ quản lý Nhạc nền luyện tập Speaking.
/// </summary>
public class BackgroundMusicService : IBackgroundMusicService
{
    /// <summary>
    /// [Dòng này làm gì]: Trường DbContext thao tác với bảng BackgroundMusics, Lessons, Courses.
    /// [Giải phẫu từng từ khóa]:
    /// - `private readonly SmartMcDbContext _db;`: Inject từ DI Container qua Constructor.
    /// </summary>
    private readonly SmartMcDbContext _db;

    /// <summary>
    /// [Dòng này làm gì]: Dịch vụ kết nối API Cloudinary để upload và xóa file âm thanh trên CDN.
    /// [Giải phẫu từng từ khóa]:
    /// - `private readonly ICloudinaryService _cloudinaryService;`: Interface trừu tượng hóa hạ tầng đám mây.
    /// </summary>
    private readonly ICloudinaryService _cloudinaryService;

    /// <summary>
    /// [Dòng này làm gì]: Logger ghi nhận lỗi và vết xử lý của dịch vụ nhạc nền.
    /// </summary>
    private readonly ILogger<BackgroundMusicService> _logger;

    /// <summary>
    /// Danh sách phần mở rộng tập tin âm thanh hợp lệ cho phép tải lên hệ thống.
    /// </summary>
    private static readonly string[] AllowedExtensions = { ".mp3", ".wav", ".ogg", ".m4a" };

    /// <summary>
    /// Giới hạn dung lượng tối đa cho 1 file nhạc nền: 5 Megabytes (5 * 1024 * 1024 bytes).
    /// </summary>
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    /// <summary>
    /// Khởi tạo Service với các dependency được inject qua Constructor.
    /// </summary>
    public BackgroundMusicService(
        SmartMcDbContext db,
        ICloudinaryService cloudinaryService,
        ILogger<BackgroundMusicService> logger)
    {
        _db = db;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách các bài nhạc nền mặc định toàn hệ thống.
    /// - End-to-End Flow: Truy vấn BackgroundMusics với AsNoTracking -> Lọc IsSystemDefault == true -> Sắp xếp theo MusicId -> Chiếu (Projection) sang BackgroundMusicDto -> ToListAsync().
    /// [Giải phẫu từng từ khóa & kỹ thuật]:
    /// - `.AsNoTracking()`: Tắt Change Tracker của EF Core, tiết kiệm RAM và tăng tốc độ đọc dữ liệu do đây là thao tác Read-only.
    /// - `.Where(m => m.IsSystemDefault)`: Lọc theo cờ boolean nhạc mặc định.
    /// - `.Select(...)`: Projection trực tiếp trong câu SQL, chỉ SELECT đúng các cột hiển thị trên UI.
    /// </summary>
    /// <returns>Danh sách BackgroundMusicDto mặc định.</returns>
    public async Task<List<BackgroundMusicDto>> GetDefaultMusicsAsync()
    {
        return await _db.BackgroundMusics
            .AsNoTracking()
            .Where(m => m.IsSystemDefault)
            .OrderBy(m => m.MusicId)
            .Select(m => new BackgroundMusicDto
            {
                MusicId = m.MusicId,
                Title = m.Title,
                AudioUrl = m.AudioUrl,
                IsSystemDefault = m.IsSystemDefault,
                LessonId = m.LessonId
            })
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách nhạc nền áp dụng cho một bài học cụ thể (bao gồm nhạc riêng của bài và nhạc chung hệ thống).
    /// - End-to-End Flow: Query BackgroundMusics với AsNoTracking -> Where(IsSystemDefault || LessonId == lessonId) -> OrderBy -> Projection DTO -> ToListAsync().
    /// [Giải phẫu logic sắp xếp .OrderBy(m => !m.IsSystemDefault)]:
    /// - Trong C#, `false` (0) nhỏ hơn `true` (1).
    /// - Biểu thức `!m.IsSystemDefault` cho ra `false` với nhạc hệ thống và `true` với nhạc bài học.
    /// - Do đó, nhạc hệ thống luôn được sắp xếp ở đầu danh sách, sau đó mới đến các bài nhạc tải thêm của bài học.
    /// </summary>
    /// <param name="lessonId">ID bài học cần lấy nhạc.</param>
    /// <returns>Danh sách các bản nhạc nền khả dụng cho bài học.</returns>
    public async Task<List<BackgroundMusicDto>> GetMusicsForLessonAsync(int lessonId)
    {
        return await _db.BackgroundMusics
            .AsNoTracking()
            .Where(m => m.IsSystemDefault || m.LessonId == lessonId)
            .OrderBy(m => !m.IsSystemDefault)
            .ThenBy(m => m.MusicId)
            .Select(m => new BackgroundMusicDto
            {
                MusicId = m.MusicId,
                Title = m.Title,
                AudioUrl = m.AudioUrl,
                IsSystemDefault = m.IsSystemDefault,
                LessonId = m.LessonId
            })
            .ToListAsync();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tải lên một file âm thanh và liên kết trực tiếp vào bài học.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Validate file âm thanh (định dạng, kích thước, rỗng) qua ValidateAudioFile.
    ///   - Bước 2: Tìm bài học kèm thông tin Khóa học trong Database.
    ///   - Bước 3: Kiểm tra quyền sở hữu (Authorization check) của giảng viên đối với khóa học.
    ///   - Bước 4: Gọi CloudinaryService tải file lên thư mục background-music/lesson-{lessonId}.
    ///   - Bước 5: Tạo thực thể BackgroundMusic mới, lưu vào CSDL và trả về DTO.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="file">File âm thanh nhị phân.</param>
    /// <param name="title">Tên bản nhạc.</param>
    /// <param name="instructorId">ID giảng viên thực hiện.</param>
    /// <returns>BackgroundMusicDto sau khi lưu thành công.</returns>
    public async Task<BackgroundMusicDto> UploadMusicForLessonAsync(
        int lessonId,
        IFormFile file,
        string title,
        int instructorId)
    {
        // [BƯỚC 1]: Kiểm tra định dạng và dung lượng file đầu vào
        ValidateAudioFile(file);

        // [BƯỚC 2]: Truy vấn bài học và thông tin khóa học chủ quản
        var lesson = await _db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        // [BƯỚC 2.1]: Rẽ nhánh kiểm tra sự tồn tại của bài học
        // - Điều kiện: `lesson == null` (Bài học không tồn tại trong DB hoặc đã bị xóa).
        // - Trường hợp ĐÚNG (TRUE): Ném KeyNotFoundException dừng luồng ngay.
        // - Trường hợp SAI (FALSE): Bài học tồn tại hợp lệ, đi tiếp xuống [BƯỚC 3].
        if (lesson == null)
        {
            throw new KeyNotFoundException("Không tìm thấy bài học tương ứng.");
        }

        // [BƯỚC 3]: Kiểm tra phân quyền truy cập tài nguyên (IDOR Protection)
        // - Điều kiện: `lesson.Course.InstructorId != instructorId`.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Giảng viên đang đăng nhập không phải là người phụ trách khóa học này.
        //     + Ném UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.").
        // - Trường hợp SAI (FALSE): Giảng viên hợp lệ, tiếp tục luồng upload ở [BƯỚC 4].
        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.");
        }

        // [BƯỚC 4]: Đẩy file âm thanh lên máy chủ lưu trữ đám mây Cloudinary
        var uploadResult = await _cloudinaryService.UploadVideoAsync(file, $"background-music/lesson-{lessonId}");
        
        // Rẽ nhánh kiểm tra kết quả upload từ Cloudinary
        if (uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
        {
            _logger.LogError("Cloudinary upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException("Không thể tải tập tin nhạc lên máy chủ lưu trữ.");
        }

        // [BƯỚC 5]: Khởi tạo đối tượng thực thể BackgroundMusic và lưu vào CSDL
        // Toán tử 3 ngôi: Nếu title rỗng thì tự động lấy tên gốc của file bỏ phần mở rộng làm tiêu đề
        var music = new BackgroundMusic
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            AudioUrl = uploadResult.SecureUrl.ToString(),
            CloudinaryPublicId = uploadResult.PublicId,
            IsSystemDefault = false,
            LessonId = lessonId,
            CreatedAt = DateTime.UtcNow
        };

        _db.BackgroundMusics.Add(music);
        await _db.SaveChangesAsync();

        // [BƯỚC 6]: Ánh xạ thực thể vừa lưu sang DTO trả về cho Controller
        return new BackgroundMusicDto
        {
            MusicId = music.MusicId,
            Title = music.Title,
            AudioUrl = music.AudioUrl,
            IsSystemDefault = music.IsSystemDefault,
            LessonId = music.LessonId
        };
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tải trước tập tin âm thanh lên Cloudinary phục vụ giao diện xem trước (Pre-upload).
    /// - End-to-End Flow: Validate file -> Upload lên thư mục chung 'background-music/custom-uploads' trên Cloudinary -> Bắt lỗi upload -> Trả về PreUploadMusicResultDto (Title, AudioUrl, PublicId).
    /// </summary>
    /// <param name="file">File âm thanh.</param>
    /// <param name="title">Tên bản nhạc.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>PreUploadMusicResultDto chứa URL xem trước.</returns>
    public async Task<PreUploadMusicResultDto> PreUploadMusicAsync(IFormFile file, string title, int instructorId)
    {
        // [BƯỚC 1]: Kiểm tra tính hợp lệ của file âm thanh
        ValidateAudioFile(file);

        // [BƯỚC 2]: Tải file lên thư mục tạm custom-uploads trên Cloudinary
        var uploadResult = await _cloudinaryService.UploadVideoAsync(file, "background-music/custom-uploads");
        
        // Rẽ nhánh kiểm tra lỗi từ dịch vụ Cloudinary
        if (uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
        {
            _logger.LogError("Cloudinary pre-upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException("Không thể tải tập tin nhạc lên Cloudinary.");
        }

        // [BƯỚC 3]: Trả về thông tin file đã tải lên để Client nghe thử
        return new PreUploadMusicResultDto
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            AudioUrl = uploadResult.SecureUrl.ToString(),
            CloudinaryPublicId = uploadResult.PublicId ?? string.Empty
        };
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Liên kết danh sách các bản nhạc đã upload từ trước vào một bài học (Tác vụ hàng loạt - Batch Linking).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Kiểm tra danh sách rỗng (musics null hoặc count == 0) -> Trả về danh sách rỗng ngay.
    ///   - Bước 2: Tìm bài học và kiểm tra quyền sở hữu của giảng viên.
    ///   - Bước 3: Tạo danh sách các thực thể BackgroundMusic mới.
    ///   - Bước 4: Gọi AddRange và SaveChangesAsync một lần duy nhất (Batch Insert tối ưu).
    ///   - Bước 5: Trả về danh sách BackgroundMusicDto đã lưu.
    /// [Tại sao dùng AddRange]: Gom toàn bộ các bản ghi vào một lệnh INSERT duy nhất, giảm số vòng trao đổi mạng (network round-trips) với Database.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="musics">Danh sách thông tin nhạc cần liên kết.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách các bản nhạc vừa được gán vào bài học.</returns>
    public async Task<List<BackgroundMusicDto>> LinkMusicsToLessonAsync(
        int lessonId,
        List<LinkBackgroundMusicItem> musics,
        int instructorId)
    {
        // [BƯỚC 1]: Rẽ nhánh kiểm tra danh sách đầu vào
        // - Điều kiện: `musics == null || musics.Count == 0`.
        // - Xử lý: Trả về `new List<BackgroundMusicDto>()` rỗng ngay, không tốn tài nguyên truy vấn DB.
        if (musics == null || musics.Count == 0)
        {
            return new List<BackgroundMusicDto>();
        }

        // [BƯỚC 2]: Truy vấn bài học và kiểm tra quyền tác giả
        var lesson = await _db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        // Rẽ nhánh: Bài học không tồn tại -> Ném KeyNotFoundException
        if (lesson == null)
        {
            throw new KeyNotFoundException("Không tìm thấy bài học tương ứng.");
        }

        // Rẽ nhánh: Giảng viên không có quyền sở hữu -> Ném UnauthorizedAccessException
        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.");
        }

        // [BƯỚC 3]: Ánh xạ danh sách đầu vào sang danh sách Entity BackgroundMusic
        var newRecords = musics.Select(m => new BackgroundMusic
        {
            Title = m.Title.Trim(),
            AudioUrl = m.AudioUrl.Trim(),
            CloudinaryPublicId = m.CloudinaryPublicId,
            IsSystemDefault = false,
            LessonId = lessonId,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        // [BƯỚC 4]: Chèn hàng loạt vào Database với 1 lần gọi SaveChangesAsync
        _db.BackgroundMusics.AddRange(newRecords);
        await _db.SaveChangesAsync();

        // [BƯỚC 5]: Chiếu kết quả trả về cho Controller
        return newRecords.Select(m => new BackgroundMusicDto
        {
            MusicId = m.MusicId,
            Title = m.Title,
            AudioUrl = m.AudioUrl,
            IsSystemDefault = m.IsSystemDefault,
            LessonId = m.LessonId
        }).ToList();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa một bản nhạc nền khỏi hệ thống và dọn dẹp file nhị phân trên Cloudinary.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Tìm bản nhạc trong DB kèm thông tin Lesson và Course.
    ///   - Bước 2: Nếu không tìm thấy -> Trả về false.
    ///   - Bước 3: Nếu là nhạc hệ thống (IsSystemDefault == true) -> Ném InvalidOperationException (Khóa bảo vệ).
    ///   - Bước 4: Kiểm tra giảng viên có quyền sở hữu khóa học hay không -> Ném UnauthorizedAccessException nếu sai.
    ///   - Bước 5: Gọi CloudinaryService.DeleteFileAsync để xóa file âm thanh vật lý.
    ///   - Bước 6: Xóa bản ghi trong DbContext, gọi SaveChangesAsync và trả về true.
    /// </summary>
    /// <param name="musicId">ID bản nhạc cần xóa.</param>
    /// <param name="instructorId">ID giảng viên yêu cầu xóa.</param>
    /// <returns>True nếu xóa thành công, False nếu bản ghi không tồn tại.</returns>
    public async Task<bool> DeleteMusicAsync(int musicId, int instructorId)
    {
        // [BƯỚC 1]: Truy vấn bản ghi nhạc nền kèm theo bài học và khóa học liên quan
        var music = await _db.BackgroundMusics
            .Include(m => m.Lesson)
            .ThenInclude(l => l!.Course)
            .FirstOrDefaultAsync(m => m.MusicId == musicId);

        // [BƯỚC 2]: Rẽ nhánh kiểm tra sự tồn tại của bản nhạc
        // - Điều kiện: `music == null`.
        // - Xử lý: Trả về false để Controller trả mã HTTP 404 Not Found.
        if (music == null)
        {
            return false;
        }

        // [BƯỚC 3]: Rẽ nhánh bảo vệ tài nguyên hệ thống (System Default Protection)
        // - Điều kiện: `music.IsSystemDefault == true`.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Đây là nhạc nền chuẩn của hệ thống (dùng chung cho mọi khóa học).
        //     + Ném ra InvalidOperationException("Không thể xóa nhạc nền mặc định của hệ thống.").
        //     + Ngăn chặn vô tình hay cố ý xóa mất nhạc mẫu làm gãy giao diện học viên.
        // - Trường hợp SAI (FALSE): Nhạc riêng của bài học, được phép tiếp tục xem xét quyền ở [BƯỚC 4].
        if (music.IsSystemDefault)
        {
            throw new InvalidOperationException("Không thể xóa nhạc nền mặc định của hệ thống.");
        }

        // [BƯỚC 4]: Kiểm tra quyền hạn của giảng viên (Authorization Check)
        // - Điều kiện: `music.Lesson?.Course != null && music.Lesson.Course.InstructorId != instructorId`.
        // - Xử lý: Ném UnauthorizedAccessException("Bạn không có quyền xóa nhạc nền này.").
        if (music.Lesson?.Course != null && music.Lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa nhạc nền này.");
        }

        // [BƯỚC 5]: Dọn dẹp tập tin âm thanh trên Cloudinary (Best-effort cleanup)
        if (!string.IsNullOrEmpty(music.CloudinaryPublicId))
        {
            try
            {
                await _cloudinaryService.DeleteFileAsync(music.CloudinaryPublicId, ResourceType.Video);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete file from Cloudinary with PublicId {PublicId}", music.CloudinaryPublicId);
            }
        }

        // [BƯỚC 6]: Xóa bản ghi trong Database và hoàn tất giao dịch
        _db.BackgroundMusics.Remove(music);
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm dùng chung (Private Helper) thẩm định tính hợp lệ của file âm thanh:
    ///   Kiểm tra file null/rỗng, vượt quá 5MB, hoặc sai phần mở rộng trong whitelist (.mp3, .wav, .ogg, .m4a).
    /// </summary>
    /// <param name="file">File cần kiểm tra.</param>
    /// <exception cref="ArgumentException">Ném ngoại lệ khi vi phạm bất kỳ điều kiện nào.</exception>
    private static void ValidateAudioFile(IFormFile file)
    {
        // Kiểm tra 1: File null hoặc kích thước 0 byte
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Vui lòng tải lên tập tin âm thanh.");
        }

        // Kiểm tra 2: Kích thước vượt quá ngưỡng cho phép (5MB)
        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException("Dung lượng tập tin nhạc không được vượt quá 5MB.");
        }

        // Kiểm tra 3: Phần mở rộng tập tin (Whitelist verification)
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            throw new ArgumentException("Định dạng tập tin không hợp lệ. Chỉ chấp nhận các định dạng: .mp3, .wav, .ogg, .m4a.");
        }
    }
}
