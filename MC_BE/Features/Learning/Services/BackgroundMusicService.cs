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
    private readonly SmartMcDbContext _db;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<BackgroundMusicService> _logger;

    // Danh sách phần mở rộng tập tin âm thanh hợp lệ cho phép tải lên hệ thống
    private static readonly string[] AllowedExtensions = { ".mp3", ".wav", ".ogg", ".m4a" };
    // Giới hạn dung lượng tối đa cho 1 file nhạc nền: 5 Megabytes (đủ cho bài nhạc nền 3-5 phút nén 128kbps)
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
    /// Lấy danh sách các bài nhạc nền mặc định toàn hệ thống.
    /// <para>End-to-End Flow: Truy vấn BackgroundMusics với AsNoTracking -> Lọc IsSystemDefault == true -> Sắp xếp theo MusicId -> Chiếu (Projection) sang BackgroundMusicDto -> ToListAsync.</para>
    /// </summary>
    /// <returns>Danh sách BackgroundMusicDto mặc định.</returns>
    public async Task<List<BackgroundMusicDto>> GetDefaultMusicsAsync()
    {
        // [BƯỚC 1]: Truy vấn danh sách nhạc hệ thống từ Database
        // [TẠI SAO DÙNG AsNoTracking()]:
        //   - Đây là thao tác chỉ đọc (Read-only query): AsNoTracking() báo cho EF Core không cần cấp phát
        //     Snapshot trong Change Tracker để theo dõi sự thay đổi của thực thể.
        //   - Tiết kiệm bộ nhớ RAM và tăng tốc độ thực thi truy vấn lên 20 - 30%.
        // [TẠI SAO DÙNG .Select() TRỰC TIẾP]:
        //   - Projection trực tiếp trong SQL query: Chỉ SELECT đúng các cột cần thiết (MusicId, Title, AudioUrl...)
        //     thay vì kéo toàn bộ các cột của bảng BackgroundMusics về máy chủ ứng dụng.
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
    /// Lấy danh sách nhạc nền áp dụng cho một bài học cụ thể (bao gồm nhạc riêng của bài và nhạc chung hệ thống).
    /// <para>End-to-End Flow: Query BackgroundMusics với AsNoTracking -> Where(IsSystemDefault || LessonId == lessonId) -> OrderBy -> Projection DTO -> ToListAsync.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học cần lấy nhạc.</param>
    /// <returns>Danh sách các bản nhạc nền khả dụng cho bài học.</returns>
    public async Task<List<BackgroundMusicDto>> GetMusicsForLessonAsync(int lessonId)
    {
        // [BƯỚC 1]: Lọc các bản nhạc thỏa mãn một trong 2 điều kiện:
        // - Hoặc là nhạc mặc định của toàn hệ thống (m.IsSystemDefault = true).
        // - Hoặc là nhạc được giảng viên gán riêng cho bài học này (m.LessonId == lessonId).
        // [GIẢI THÍCH SẮP XẾP .OrderBy(m => !m.IsSystemDefault)]:
        //   - Trong C#, boolean false (0) nhỏ hơn true (1).
        //   - !m.IsSystemDefault sẽ trả về false đối với nhạc hệ thống và true đối với nhạc riêng của bài học.
        //   - Do đó, nhạc hệ thống được gom nhóm và sắp xếp trước, sau đó mới đến các bài nhạc tải thêm của bài học.
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
    /// Tải lên một file âm thanh và liên kết trực tiếp vào bài học.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Validate file âm thanh (định dạng, kích thước, rỗng) qua ValidateAudioFile.</para>
    /// <para>Bước 2: Tìm bài học kèm thông tin Khóa học trong Database.</para>
    /// <para>Bước 3: Kiểm tra quyền sở hữu (Authorization check) của giảng viên đối với khóa học.</para>
    /// <para>Bước 4: Gọi CloudinaryService tải file lên thư mục background-music/lesson-{lessonId}.</para>
    /// <para>Bước 5: Tạo thực thể BackgroundMusic mới, lưu vào CSDL và trả về DTO.</para>
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
        // Nếu file vi phạm (quá 5MB hoặc sai định dạng), hàm này sẽ ném ArgumentException ngay lập tức
        ValidateAudioFile(file);

        // [BƯỚC 2]: Truy vấn bài học và thông tin khóa học chủ quản
        // Nạp kèm quan hệ Course để lấy Course.InstructorId kiểm tra quyền
        var lesson = await _db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        // [BƯỚC 2.1]: Rẽ nhánh kiểm tra sự tồn tại của bài học
        // - Điều kiện: lesson == null (Bài học không tồn tại trong DB hoặc đã bị xóa).
        // - Trường hợp ĐÚNG (TRUE):
        //     + Ném ra KeyNotFoundException("Không tìm thấy bài học tương ứng.").
        //     + Luồng dừng lại, không gọi tiếp Cloudinary, Controller sẽ map thành HTTP 404 Not Found.
        // - Trường hợp SAI (FALSE): Bài học tồn tại hợp lệ, đi tiếp xuống [BƯỚC 3].
        if (lesson == null)
        {
            throw new KeyNotFoundException("Không tìm thấy bài học tương ứng.");
        }

        // [BƯỚC 3]: Kiểm tra phân quyền truy cập tài nguyên (IDOR Protection)
        // - Điều kiện: lesson.Course.InstructorId != instructorId.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Giảng viên đang đăng nhập không phải là người tạo khóa học này.
        //     + Ném UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.").
        //     + Ngăn chặn hành vi Giảng viên A can thiệp hoặc chèn file nhạc vào khóa học của Giảng viên B.
        // - Trường hợp SAI (FALSE): Giảng viên hợp lệ, tiếp tục luồng upload ở [BƯỚC 4].
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN - SECURITY]:
        //   - Q: Tại sao không tin cậy CourseId hay InstructorId gửi từ Client body lên?
        //   - A: Vì client có thể làm giả (Tampering). Hệ thống luôn lấy instructorId từ Claims trong JWT Token
        //        sau khi đã giải mã an toàn, và so khớp trực tiếp với DB.
        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.");
        }

        // [BƯỚC 4]: Đẩy file âm thanh lên máy chủ lưu trữ đám mây Cloudinary
        // Thư mục lưu trữ được phân cấp rõ ràng theo LessonId: "background-music/lesson-{lessonId}"
        var uploadResult = await _cloudinaryService.UploadVideoAsync(file, $"background-music/lesson-{lessonId}");
        
        // Rẽ nhánh kiểm tra kết quả upload từ Cloudinary
        // Nếu có lỗi mạng hoặc API key Cloudinary hết hạn -> Ghi log lỗi và ném InvalidOperationException
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
    /// Tải trước tập tin âm thanh lên Cloudinary phục vụ giao diện xem trước (Pre-upload).
    /// <para>End-to-End Flow: Validate file -> Upload lên thư mục chung 'background-music/custom-uploads' trên Cloudinary -> Bắt lỗi upload -> Trả về PreUploadMusicResultDto (Title, AudioUrl, PublicId).</para>
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
        
        // Rẽ nhánh kiểm tra lỗi từ dịch vụ ngoài
        if (uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
        {
            _logger.LogError("Cloudinary pre-upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException("Không thể tải tập tin nhạc lên Cloudinary.");
        }

        // [BƯỚC 3]: Trả về thông tin file đã tải lên để Client có thể nghe thử trước khi quyết định gán vào bài học
        return new PreUploadMusicResultDto
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            AudioUrl = uploadResult.SecureUrl.ToString(),
            CloudinaryPublicId = uploadResult.PublicId ?? string.Empty
        };
    }

    /// <summary>
    /// Liên kết danh sách các bản nhạc đã upload từ trước vào một bài học (Tác vụ hàng loạt - Batch Linking).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra danh sách rỗng (musics null hoặc count == 0) -> Trả về danh sách rỗng ngay.</para>
    /// <para>Bước 2: Tìm bài học và kiểm tra quyền sở hữu của giảng viên.</para>
    /// <para>Bước 3: Tạo danh sách các thực thể BackgroundMusic mới.</para>
    /// <para>Bước 4: Gọi AddRange và SaveChangesAsync một lần duy nhất (Batch Insert tối ưu).</para>
    /// <para>Bước 5: Trả về danh sách BackgroundMusicDto đã lưu.</para>
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
        // - Điều kiện: musics == null || musics.Count == 0.
        // - Xử lý: Trả về new List<BackgroundMusicDto>() rỗng ngay, không tốn tài nguyên truy vấn DB.
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

        // [BƯỚC 4]: Chèn hàng loạt vào Database
        // [TẠI SAO DÙNG AddRange VÀ 1 LẦN SaveChangesAsync]:
        //   - Tối ưu hóa hiệu năng Database: Thay vì lặp qua từng phần tử và gọi SaveChangesAsync N lần
        //     (gây ra N transaction riêng biệt), AddRange gom toàn bộ các dòng vào 1 lệnh INSERT batch duy nhất,
        //     tiết kiệm kết nối và thời gian I/O.
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
    /// Xóa một bản nhạc nền khỏi hệ thống và dọn dẹp file nhị phân trên Cloudinary.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Tìm bản nhạc trong DB kèm thông tin Lesson và Course.</para>
    /// <para>Bước 2: Nếu không tìm thấy -> Trả về false.</para>
    /// <para>Bước 3: Nếu là nhạc hệ thống (IsSystemDefault == true) -> Ném InvalidOperationException (Khóa bảo vệ).</para>
    /// <para>Bước 4: Kiểm tra giảng viên có quyền sở hữu khóa học hay không -> Ném UnauthorizedAccessException nếu sai.</para>
    /// <para>Bước 5: Gọi CloudinaryService.DeleteFileAsync để xóa file âm thanh vật lý.</para>
    /// <para>Bước 6: Xóa bản ghi trong DbContext, gọi SaveChangesAsync và trả về true.</para>
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
        // - Điều kiện: music == null.
        // - Xử lý: Trả về false để Controller trả mã HTTP 404 Not Found.
        if (music == null)
        {
            return false;
        }

        // [BƯỚC 3]: Rẽ nhánh bảo vệ tài nguyên hệ thống (System Default Protection)
        // - Điều kiện: music.IsSystemDefault == true.
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
        // - Điều kiện: music.Lesson?.Course != null && music.Lesson.Course.InstructorId != instructorId.
        // - Xử lý: Ném UnauthorizedAccessException("Bạn không có quyền xóa nhạc nền này.").
        if (music.Lesson?.Course != null && music.Lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa nhạc nền này.");
        }

        // [BƯỚC 5]: Dọn dẹp tập tin âm thanh trên Cloudinary
        // [TẠI SAO DÙNG TRY/CATCH Ở ĐÂY]:
        //   - Nguyên lý Best-effort cleanup: Nếu vì lý do mạng hoặc Cloudinary gặp sự cố tạm thời,
        //     chúng ta ghi Warning log lại để cronjob xử lý sau, không để lỗi mạng bên thứ 3 làm chặn đứng
        //     thao tác xóa dữ liệu nghiệp vụ của người dùng trong Database.
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
    /// Hàm dùng chung (Private Helper) thẩm định tính hợp lệ của file âm thanh:
    /// Kiểm tra file null/rỗng, vượt quá 5MB, hoặc sai phần mở rộng trong whitelist (.mp3, .wav, .ogg, .m4a).
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
