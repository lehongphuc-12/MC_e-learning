// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Tầng Dịch vụ nghiệp vụ - Business Logic Layer).
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Định nghĩa các nghiệp vụ cốt lõi quản lý Nhạc nền luyện tập Speaking (Background Music).
//   Áp dụng Dependency Inversion Principle (DIP) trong SOLID để Controller phụ thuộc vào Interface,
//   giúp dễ dàng viết Unit Test (Mocking) và thay thế tầng triển khai.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp nhạc nền cho học viên phát trong lúc thu âm bài nói (thuyết trình, dẫn chương trình MC).
// - Hỗ trợ giảng viên tải lên nhạc nền cho bài học cụ thể, hoặc tải trước (Pre-upload) lên đám mây Cloudinary
//   rồi liên kết hàng loạt (Batch linking) vào bài học.
// - Quản lý xóa và bảo vệ nhạc nền: Chỉ giảng viên sở hữu khóa học mới có quyền upload/xóa nhạc của bài học đó.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller gọi vào: BackgroundMusicController.
// - Triển khai thực tế: BackgroundMusicService.
// - Phụ thuộc hạ tầng: CloudinaryService (upload file âm thanh), UnitOfWork / SmartMcDbContext (lưu trữ DB).
// ====================================================================================================

using MC_BE.Features.Learning.DTOs;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ quản lý Nhạc nền (Background Music) cho các bài tập luyện nói.
/// [Giải phẫu cú pháp]:
/// - `public`: Truy cập toàn giải pháp.
/// - `interface`: Hợp đồng trừu tượng.
/// - `IBackgroundMusicService`: Tên giao diện chuẩn convention C#.
/// </summary>
public interface IBackgroundMusicService
{
    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách toàn bộ các bản nhạc nền mặc định của hệ thống (IsSystemDefault = true).
    /// Áp dụng cho mọi bài học khi bài học đó chưa được cấu hình nhạc nền riêng.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<List<BackgroundMusicDto>>`: Thao tác bất đồng bộ trả về danh sách đối tượng DTO nhạc nền.
    /// - `GetDefaultMusicsAsync`: Tên phương thức quy ước TAP.
    /// </summary>
    /// <returns>Danh sách các BackgroundMusicDto mặc định.</returns>
    Task<List<BackgroundMusicDto>> GetDefaultMusicsAsync();

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách nhạc nền khả dụng cho một bài học cụ thể.
    /// Bao gồm cả nhạc nền gán riêng cho Lesson đó và các bản nhạc nền mặc định toàn hệ thống.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: Khóa ngoại ID của bài học.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Danh sách nhạc nền phù hợp với bài học.</returns>
    Task<List<BackgroundMusicDto>> GetMusicsForLessonAsync(int lessonId);

    /// <summary>
    /// [Dòng này làm gì]: Tải lên trực tiếp một file nhạc (.mp3, .wav, .ogg) và liên kết ngay vào bài học tương ứng.
    /// Kiểm tra quyền giảng viên của khóa học trước khi thực hiện.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int lessonId`: ID bài học cần gắn nhạc.
    /// - `IFormFile file`: File âm thanh nhị phân gửi qua multipart request.
    /// - `string title`: Tiêu đề bài nhạc hiển thị cho học viên.
    /// - `int instructorId`: ID giảng viên thực hiện thao tác (lấy từ JWT token Claims).
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="file">File nhị phân âm thanh từ client gửi lên.</param>
    /// <param name="title">Tiêu đề bản nhạc.</param>
    /// <param name="instructorId">ID giảng viên thực hiện thao tác (lấy từ JWT token).</param>
    /// <returns>BackgroundMusicDto đã được lưu thành công kèm CDN AudioUrl.</returns>
    Task<BackgroundMusicDto> UploadMusicForLessonAsync(int lessonId, IFormFile file, string title, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Tải trước (Pre-upload) file nhạc lên CDN Cloudinary mà chưa lưu vào bài học nào trong DB.
    /// Dùng cho luồng giao diện Wizard tạo bài giảng: giảng viên upload file trước để nghe thử.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<PreUploadMusicResultDto>`: Trả về DTO chứa URL Cloudinary và PublicId để xem trước và xóa tạm nếu hủy.
    /// </summary>
    /// <param name="file">Tập tin âm thanh.</param>
    /// <param name="title">Tiêu đề dự kiến.</param>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Thông tin URL và CloudinaryPublicId của file vừa upload.</returns>
    Task<PreUploadMusicResultDto> PreUploadMusicAsync(IFormFile file, string title, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Liên kết danh sách các bản nhạc đã upload từ trước vào bài học (Batch Linking).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `List<LinkBackgroundMusicItem> musics`: Danh sách thông tin nhạc đã pre-upload.
    /// - `int instructorId`: ID giảng viên để kiểm tra quyền sở hữu khóa học.
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="musics">Danh sách thông tin nhạc cần liên kết.</param>
    /// <param name="instructorId">ID giảng viên thực hiện.</param>
    /// <returns>Danh sách các bản nhạc nền mới được tạo.</returns>
    Task<List<BackgroundMusicDto>> LinkMusicsToLessonAsync(int lessonId, List<LinkBackgroundMusicItem> musics, int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Xóa một bản nhạc nền khỏi hệ thống và xóa file tương ứng trên Cloudinary.
    /// Ngăn chặn xóa nhạc mặc định hệ thống trừ khi có quyền quản trị cao nhất.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<bool>`: Trả về true nếu xóa thành công; false nếu không tìm thấy.
    /// - `int musicId`: Khóa chính của bản ghi BackgroundMusic.
    /// - `int instructorId`: ID giảng viên yêu cầu xóa (kiểm tra phân quyền).
    /// </summary>
    /// <param name="musicId">ID bản nhạc cần xóa.</param>
    /// <param name="instructorId">ID giảng viên yêu cầu xóa.</param>
    /// <returns>True nếu xóa thành công; False nếu không tìm thấy hoặc không có quyền.</returns>
    Task<bool> DeleteMusicAsync(int musicId, int instructorId);
}
