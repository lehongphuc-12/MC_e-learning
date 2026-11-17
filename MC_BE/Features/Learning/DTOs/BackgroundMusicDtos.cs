// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / Feature-based).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa các Model đóng gói dữ liệu Request/Response cho tính năng Nhạc nền luyện tập Speaking
//   (Background Music Management) phục vụ luyện phát âm, kịch bản dẫn chương trình.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý nhạc nền cho bài học: Hỗ trợ giảng viên tải lên file âm thanh (.mp3, .wav, .ogg), tải trước lên Cloudinary
//   (Pre-upload), liên kết nhạc nền vào bài học (LinkBackgroundMusics), hoặc gán làm nhạc nền mặc định hệ thống.
// - Phục vụ trải nghiệm học viên khi thực hành thu âm bài nói với nhạc nền du dương đúng phong cách MC/thuyết trình.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client: Gửi Multipart Form Data (file nhạc) hoặc JSON payload tới BackgroundMusicController.
// - Controller: Nhận DTOs -> chuyển qua BackgroundMusicService.
// - External Service: CloudinaryDotNet tải file nhạc lên đám mây, trả về AudioUrl và CloudinaryPublicId.
// - Database: Bảng BackgroundMusics lưu thông tin nhạc nền gắn với LessonId hoặc SystemDefault.
// ====================================================================================================

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO đại diện cho thông tin bản nhạc nền trả về cho Client phát trong quá trình luyện tập Speaking.
/// </summary>
public class BackgroundMusicDto
{
    // [Dòng này làm gì]: Khai báo thuộc tính khóa chính định danh duy nhất của bản nhạc nền trong CSDL.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Access modifier cho phép đọc/ghi từ mọi assembly bên ngoài.
    //   - `int`: Kiểu số nguyên có dấu 32-bit (System.Int32), tương ứng cột integer / serial trong PostgreSQL/SQL Server.
    //   - `MusicId`: Tên định danh thuộc tính, map với Primary Key của bảng BackgroundMusics.
    //   - `{ get; set; }`: Cung cấp accessor đọc và ghi giá trị.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Là giá trị nhận dạng duy nhất để Client gửi lại trong các lệnh phát nhạc, chọn nhạc hoặc xóa bài nhạc (`DELETE api/speaking-scripts/musics/{musicId}`).
    // [Cách viết thay thế & So sánh]: Dùng `long` (Int64) nếu số lượng bản ghi nhạc nền vượt quá 2 tỷ, hoặc dùng `Guid` nếu hệ thống phân tán đa cụm. Với nghiệp vụ nhạc nền khóa học, `int` là tối ưu dung lượng nhất.
    public int MusicId { get; set; }

    // [Dòng này làm gì]: Khai báo thuộc tính tiêu đề hoặc tên gọi của bản nhạc nền (ví dụ: "Acoustic Nhẹ Nhàng").
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập công khai từ bên ngoài.
    //   - `string`: Kiểu dữ liệu chuỗi ký tự Unicode lưu tên bài nhạc.
    //   - `Title`: Tên thuộc tính.
    //   - `{ get; set; }`: Getter/Setter tự động.
    //   - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Tuân thủ Nullable Reference Types trong C# 9+. Tránh cảnh báo CS8618 và bảo đảm không bao giờ trả về trường `title: null` trong JSON response, giúp Frontend tránh lỗi crash khi render tiêu đề.
    // [Cách viết thay thế & So sánh]: Có thể dùng `required string Title` (C# 11+), nhưng `= string.Empty;` tương thích cao nhất với các serializer.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo thuộc tính lưu trữ đường dẫn URL trực tiếp (CDN Audio URL) của file âm thanh trên Cloudinary.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Bộc lộ thuộc tính ra ngoài class.
    //   - `string`: Chuỗi ký tự lưu địa chỉ web HTTPS an toàn.
    //   - `AudioUrl`: Tên định danh thuộc tính.
    //   - `{ get; set; }`: Getter/Setter tự động.
    //   - `= string.Empty;`: Khởi tạo chuỗi rỗng.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Là tài nguyên cốt lõi để thẻ `<audio>` hoặc AudioContext của HTML5 phát âm thanh trực tiếp trên trình duyệt của học viên.
    // [Cách viết thay thế & So sánh]: Có thể dùng kiểu `System.Uri`, nhưng trong DTO truyền tải JSON qua REST API thì kiểu `string` là định dạng chuẩn hóa và nhẹ nhất.
    public string AudioUrl { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo cờ đánh dấu bản nhạc này có phải là nhạc mặc định của toàn hệ thống hay không.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập công khai.
    //   - `bool`: Kiểu dữ liệu logic boolean (System.Boolean), chỉ nhận 2 giá trị `true` hoặc `false` (chiếm 1 byte).
    //   - `IsSystemDefault`: Tên thuộc tính theo quy ước đặt tên boolean bắt đầu bằng tiền tố `Is`.
    //   - `{ get; set; }`: Getter/Setter tự động.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Phục vụ logic nghiệp vụ phân quyền và bảo vệ tài nguyên: Nhạc hệ thống (`IsSystemDefault == true`) không gắn riêng vào bài học nào (`LessonId == null`) và bị khóa cấm xóa đối với người dùng thông thường để tránh làm gãy ứng dụng.
    // [Cách viết thay thế & So sánh]: Có thể dùng Enum phân loại `MusicScope { SystemDefault, LessonCustom }`, nhưng `bool` đơn giản, tiết kiệm bộ nhớ và trực quan hơn khi mapping cột `is_system_default boolean` trong CSDL.
    public bool IsSystemDefault { get; set; }

    // [Dòng này làm gì]: Khai báo thuộc tính khóa ngoại liên kết bản nhạc với một bài học cụ thể (LessonId).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Phạm vi truy cập công khai.
    //   - `int?`: Nullable Value Type (System.Nullable<int>). Dấu `?` cho phép biến kiểu số nguyên nhận giá trị `null`.
    //   - `LessonId`: Khóa ngoại tham chiếu tới bảng Lessons.
    //   - `{ get; set; }`: Getter/Setter tự động.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Bản nhạc nền có 2 loại: nếu là nhạc dùng chung cho toàn hệ thống thì `LessonId` sẽ mang giá trị `null`; nếu là nhạc tải lên riêng cho một bài học thì `LessonId` sẽ có giá trị số cụ thể. Nếu không dùng `int?` mà dùng `int`, giá trị mặc định là 0, sẽ gây vi phạm ràng buộc khóa ngoại (Foreign Key Violation) trong CSDL.
    // [Cách viết thay thế & So sánh]: Có thể viết tường minh `Nullable<int> LessonId`, nhưng `int?` là cú pháp ngắn gọn và chuẩn hóa của C#.
    public int? LessonId { get; set; }
}

/// <summary>
/// Request DTO nhận file âm thanh upload trực tiếp qua multipart/form-data từ Giảng viên/Admin.
/// </summary>
public class UploadBackgroundMusicRequest
{
    // [Dòng này làm gì]: Ràng buộc kiểm tra bắt buộc người dùng phải nhập tiêu đề bản nhạc.
    // [Giải phẫu từng từ khóa]:
    //   - `[Required]`: DataAnnotation Validation Attribute trong namespace System.ComponentModel.DataAnnotations. Báo hiệu cho ASP.NET Core Model Validator rằng trường này không được phép `null` hoặc chuỗi rỗng.
    //   - `ErrorMessage = "..."`: Tham số định nghĩa thông điệp lỗi tiếng Việt thân thiện trả về trong mảng `errors` khi Client vi phạm validation rule.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Ngăn chặn việc gửi tiêu đề rỗng lên máy chủ, đảm bảo tính toàn vẹn dữ liệu trước khi đi vào tầng Service.
    // [Cách viết thay thế & So sánh]: Có thể dùng thư viện FluentValidation (`RuleFor(x => x.Title).NotEmpty()`), nhưng DataAnnotations tích hợp sẵn trong ASP.NET Core mà không cần cài thêm third-party package.
    [Required(ErrorMessage = "Tiêu đề bản nhạc không được để trống.")]
    // [Dòng này làm gì]: Giới hạn độ dài tối đa của chuỗi tiêu đề là 200 ký tự.
    // [Giải phẫu từng từ khóa]:
    //   - `[MaxLength(200)]`: Attribute giới hạn độ dài ký tự tối đa của chuỗi.
    //   - `ErrorMessage = "..."`: Thông báo lỗi cụ thể khi người dùng nhập tiêu đề vượt quá 200 ký tự.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Đồng bộ với độ dài cột `VARCHAR(200)` trong CSDL. Nếu người dùng cố tình gửi chuỗi hàng nghìn ký tự, thiếu attribute này sẽ dẫn đến lỗi tràn bộ đệm hoặc văng ngoại lệ `DbUpdateException` (String or binary data would be truncated).
    [MaxLength(200, ErrorMessage = "Tiêu đề không được vượt quá 200 ký tự.")]
    // [Dòng này làm gì]: Thuộc tính lưu tiêu đề bản nhạc gửi lên từ form HTTP multipart.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Ràng buộc bắt buộc phải chọn và đính kèm file âm thanh khi submit form.
    // [Giải phẫu từng từ khóa]:
    //   - `[Required]`: Yêu cầu trường `File` không được phép null.
    //   - `ErrorMessage = "..."`: Thông báo hướng dẫn người dùng chọn đúng định dạng âm thanh.
    [Required(ErrorMessage = "Vui lòng chọn tập tin âm thanh (.mp3, .wav, .ogg).")]
    // [Dòng này làm gì]: Khai báo thuộc tính nhận file nhị phân tải lên từ giao thức HTTP Multipart Form Data.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Truy cập công khai.
    //   - `IFormFile`: Giao diện trong Microsoft.AspNetCore.Http đại diện cho một file được gửi kèm trong HTTP request. Cung cấp các thuộc tính: `.FileName`, `.Length` (kích thước byte), `.ContentType` (MIME type) và phương thức mở luồng `.OpenReadStream()` hoặc sao chép bất đồng bộ `.CopyToAsync()`.
    //   - `File`: Tên trường trong multipart form.
    //   - `{ get; set; }`: Getter/Setter.
    //   - `= null!;`: Toán tử Null-forgiving Operator (`!`). Báo cho trình biên dịch bỏ qua cảnh báo CS8618 vì ASP.NET Core Model Binder sẽ tự động gán instance của IFormFile vào thuộc tính này lúc runtime nếu request hợp lệ.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: `IFormFile` là cách thức chuẩn mực và bảo mật nhất trong ASP.NET Core để tiếp nhận file upload dạng streaming mà không làm tràn bộ nhớ RAM của server.
    // [Cách viết thay thế & So sánh]: Có thể nhận mảng byte `byte[] FileBytes`, nhưng cách này buộc server phải nạp toàn bộ file vào RAM trước khi xử lý, cực kỳ nguy hiểm nếu file dung lượng lớn gây lỗi OutOfMemory.
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// DTO trả về kết quả sau khi upload tạm file nhạc lên Cloudinary (Pre-upload step),
/// cho phép xem trước hoặc liên kết hàng loạt sau đó mà không cần upload lại.
/// </summary>
public class PreUploadMusicResultDto
{
    // [Dòng này làm gì]: Khai báo thuộc tính tiêu đề bản nhạc sau khi được chuẩn hóa (ví dụ cắt bỏ phần mở rộng .mp3 từ tên file gốc).
    // [Giải phẫu từng từ khóa]:
    //   - `public string Title { get; set; } = string.Empty;`: Thuộc tính công khai kiểu chuỗi, khởi tạo rỗng để an toàn null.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu trữ đường dẫn phát nhạc bảo mật HTTPS trên mạng phân phối nội dung (CDN) của Cloudinary.
    // [Giải phẫu từng từ khóa]:
    //   - `public string AudioUrl { get; set; } = string.Empty;`: Thuộc tính công khai kiểu chuỗi, lưu CDN URL.
    public string AudioUrl { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu mã định danh duy nhất của tài nguyên trên Cloudinary (Public ID) dùng cho việc quản lý vòng đời tài nguyên (ví dụ xóa file hoặc thay thế).
    // [Giải phẫu từng từ khóa]:
    //   - `public string CloudinaryPublicId { get; set; } = string.Empty;`: Thuộc tính công khai kiểu chuỗi lưu định danh file đám mây.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Khi cần xóa file nhạc khỏi hệ thống, API Cloudinary yêu cầu bắt buộc phải truyền `PublicId`. Nếu chỉ lưu `AudioUrl` mà không lưu `PublicId`, việc phân tách chuỗi từ URL sẽ rất dễ sai sót và gây tồn đọng file rác tốn chi phí lưu trữ trên Cloudinary.
    public string CloudinaryPublicId { get; set; } = string.Empty;
}

/// <summary>
/// DTO đại diện cho một bản ghi nhạc nền cần liên kết vào bài học trong tác vụ liên kết hàng loạt (Batch Link).
/// </summary>
public class LinkBackgroundMusicItem
{
    // [Dòng này làm gì]: Ràng buộc bắt buộc nhập tiêu đề cho từng bản nhạc trong danh sách liên kết.
    // [Giải phẫu từng từ khóa]: `[Required]`: DataAnnotation kiểm tra không null/rỗng.
    [Required]
    // [Dòng này làm gì]: Giới hạn độ dài tiêu đề tối đa 200 ký tự để khớp với lược đồ CSDL.
    [MaxLength(200)]
    // [Dòng này làm gì]: Lưu tiêu đề của bản nhạc.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Ràng buộc bắt buộc phải có URL âm thanh hợp lệ đã upload từ trước.
    [Required]
    // [Dòng này làm gì]: Giới hạn độ dài URL tối đa 1000 ký tự (phù hợp với các đường link CDN dài kèm query token).
    [MaxLength(1000)]
    // [Dòng này làm gì]: Lưu URL file âm thanh trên Cloudinary.
    public string AudioUrl { get; set; } = string.Empty;

    // [Dòng này làm gì]: Giới hạn độ dài mã PublicId tối đa 500 ký tự.
    [MaxLength(500)]
    // [Dòng này làm gì]: Lưu Public ID của file trên Cloudinary (cho phép null nếu là nhạc từ nguồn link ngoài).
    // [Giải phẫu từng từ khóa]:
    //   - `string?`: Cho phép nhận giá trị null vì đây là trường không bắt buộc.
    public string? CloudinaryPublicId { get; set; }
}

/// <summary>
/// Request DTO chứa danh sách các bản nhạc nền cần liên kết vào bài học.
/// </summary>
public class LinkBackgroundMusicsRequest
{
    // [Dòng này làm gì]: Ràng buộc danh sách nhạc liên kết không được phép null.
    [Required]
    // [Dòng này làm gì]: Khai báo thuộc tính lưu danh sách các bản nhạc nền cần liên kết vào bài học.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Công khai ra bên ngoài.
    //   - `List<LinkBackgroundMusicItem>`: Kiểu danh sách tập hợp mảng động (Generic Collection) chứa các phần tử thuộc kiểu `LinkBackgroundMusicItem`.
    //   - `Musics`: Tên định danh thuộc tính.
    //   - `{ get; set; }`: Getter/Setter tự động.
    //   - `= new();`: Cú pháp Target-typed new expression (C# 9+). Tương đương `= new List<LinkBackgroundMusicItem>();`, giúp khởi tạo sẵn một danh sách rỗng, ngăn ngừa hoàn toàn lỗi NullReferenceException khi Controller truy cập `request.Musics.Count` mà Client không gửi mảng `musics`.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Tránh lỗi null pointer khi duyệt `foreach (var m in request.Musics)`.
    public List<LinkBackgroundMusicItem> Musics { get; set; } = new();
}
