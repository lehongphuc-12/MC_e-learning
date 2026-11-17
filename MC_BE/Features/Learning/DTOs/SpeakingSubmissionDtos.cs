// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / Domain-Driven Design).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa cấu trúc dữ liệu truyền nhận cho nghiệp vụ Nộp bài nói (Speaking Submission)
//   và Chấm điểm/Đánh giá (Grading & Feedback) giữa Học viên (Learner), Giảng viên (Instructor) và Hệ thống (Backend).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Học viên gửi file ghi âm phát âm/dẫn chương trình dạng multipart/form-data (.mp3, .wav) kèm ghi chú cá nhân
//   để nộp bài theo phạm vi bài học (Lesson-level), chương (Chapter-level) hoặc bài tốt nghiệp (Final).
// - Giảng viên xem danh sách bài nộp, nghe audio phát từ Cloudinary CDN, chấm điểm (thang 0-100) và viết nhận xét.
// - Hệ thống tự động phân loại kết quả: Đạt/Không đạt (ngưỡng 80 điểm) và Xếp loại danh hiệu
//   (Xuất sắc: >=95, Giỏi: >=80, Cần cải thiện: >=50, Trung bình: >=30, Yếu: <30).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client: Gửi file audio multipart qua SpeakingSubmissionsController -> SpeakingSubmissionService.
// - Storage: Cloudinary tiếp nhận lưu trữ file âm thanh và trả về AudioUrl.
// - Database: Bảng SpeakingSubmissions, SpeakingScripts, Lessons, Courses, Users.
// ====================================================================================================

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa dữ liệu nộp bài nói từ học viên, bao gồm file ghi âm dạng nhị phân và ghi chú kèm theo.
/// </summary>
public class CreateSpeakingSubmissionRequest
{
    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính lưu ID của bài học (Lesson) mà học viên đang nộp bài nói.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Access modifier cho phép Controller, Service và Model Binder của ASP.NET Core truy cập.
    /// - `int?`: Nullable value type (System.Nullable&lt;int&gt;). Cho phép mang giá trị int hoặc null.
    ///   Ý nghĩa nghiệp vụ: Nếu bài nộp gắn với bài học cụ thể thì có giá trị; nếu nộp bài theo kịch bản độc lập (ScriptId) thì mang giá trị null.
    /// - `{ get; set; }`: Auto-implemented property, hỗ trợ đọc và gán giá trị tự động từ FormData multipart request.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Hệ thống MSEEK hỗ trợ 2 hình thức nộp bài: nộp theo bài học trong lộ trình hoặc nộp kịch bản tự do.
    /// - Nếu dùng `int` thông thường (non-nullable), giá trị mặc định là 0, Model Binder sẽ không phân biệt được người dùng không truyền hay truyền giá trị 0.
    /// [Cách viết thay thế & So sánh]:
    /// - Dùng `int LessonId`: Buộc mọi bài nộp phải có bài học, làm mất tính linh hoạt khi nộp kịch bản tổng quát.
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính lưu ID của kịch bản nói (SpeakingScript) mà học viên chọn để luyện tập.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Cho phép truy cập công khai từ bên ngoài class.
    /// - `int?`: Nullable integer. Cho phép mang giá trị null nếu học viên nộp bài trực tiếp qua LessonId (hệ thống tự suy ra script gắn với lesson).
    /// - `{ get; set; }`: Cung cấp getter và setter tự động.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Cho phép học viên chọn kịch bản mẫu từ thư viện kịch bản để thu âm.
    /// - Rủi ro: Nếu thiếu scriptId lẫn lessonId, tầng Service sẽ kiểm tra và từ chối xử lý (BadRequest).
    /// [Cách viết thay thế & So sánh]:
    /// - Bắt buộc `int ScriptId`: Sẽ gây bất tiện nếu bài học chỉ có 1 script duy nhất gắn kèm trong DB.
    /// </summary>
    public int? ScriptId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính nhận file âm thanh thu âm (.mp3, .wav) được upload trực tiếp từ thiết bị của học viên.
    /// [Giải phẫu từng từ khóa]:
    /// - `[Required(...)]`: Validation attribute của DataAnnotations, ép buộc Client phải đính kèm file trong request body multipart/form-data.
    ///   Nếu thiếu file, ModelState sẽ không hợp lệ và Controller trả về HTTP 400 Bad Request kèm thông báo chi tiết.
    /// - `public`: Phạm vi truy cập công khai.
    /// - `IFormFile`: Interface của ASP.NET Core đại diện cho một file được gửi qua HTTP request, cung cấp các thuộc tính:
    ///   Length (kích thước byte), ContentType (MIME type như audio/mpeg), FileName, và hàm OpenReadStream() để đọc luồng byte.
    /// - `{ get; set; }`: Auto-property.
    /// - `= null!;`: Toán tử Null-forgiving (`!`) gán giá trị null ban đầu nhưng trấn an trình biên dịch C# không cảnh báo CS8618,
    ///   vì giá trị thực tế sẽ được ASP.NET Core Model Binder tiêm vào khi bind HTTP request multipart.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Đây là đầu vào cốt lõi của bài tập nói MC. Thiếu file thì không có dữ liệu để upload lên Cloudinary và chấm điểm.
    /// [Cách viết thay thế & So sánh]:
    /// - Dùng `byte[] AudioBytes`: Không tối ưu cho file lớn vì tốn RAM đệm toàn bộ mảng byte trong bộ nhớ. `IFormFile` stream trực tiếp hiệu quả hơn nhiều.
    /// </summary>
    [Required(ErrorMessage = "Audio file (.mp3 or .wav) is required.")]
    public IFormFile AudioFile { get; set; } = null!;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính lưu lời nhắn, ghi chú cá nhân của học viên gửi tới giảng viên khi nộp bài.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string. Cho phép mang giá trị null nếu học viên không có ghi chú gì thêm.
    /// - `{ get; set; }`: Hỗ trợ đọc/ghi dữ liệu.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Tạo kênh giao tiếp hai chiều thân thiện (ví dụ: "Em bị khản giọng ở đoạn cuối", "Em thử nói theo phong cách vui tươi").
    /// [Cách viết thay thế & So sánh]:
    /// - Dùng `string Note = string.Empty;`: Tương đương, nhưng `string?` thể hiện rõ hơn đây là trường tùy chọn (optional field).
    /// </summary>
    public string? Note { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu chấm điểm và nhận xét của giảng viên dành cho một bài nộp Speaking.
/// </summary>
public class GradeSpeakingSubmissionRequest
{
    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính lưu điểm số đánh giá bài nói do giảng viên chấm, theo thang điểm 100.
    /// [Giải phẫu từng từ khóa]:
    /// - `[Range(0, 100, ErrorMessage = "Score must be between 0 and 100.")]`: Validation attribute kiểm tra điểm số phải nằm trong đoạn [0, 100].
    ///   Nếu vi phạm (ví dụ nhập 105 hoặc -5), ModelState tự động báo lỗi và chặn lại ngay tại tầng Controller.
    /// - `public`: Truy cập công khai.
    /// - `decimal`: Kiểu số thực 128-bit có độ chính xác cao, chuyên dùng cho điểm số học thuật và tài chính, tránh sai số dấu phẩy động của float/double.
    /// - `{ get; set; }`: Auto-property đọc/ghi.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Đảm bảo tính toàn vẹn dữ liệu học tập. Điểm số là căn cứ mở khóa bài tiếp theo (>= 80 điểm) và cấp chứng chỉ hoàn thành (100% bài đạt).
    /// [Cách viết thay thế & So sánh]:
    /// - Dùng `double Score`: Có thể xảy ra sai số làm tròn thập phân nhị phân (ví dụ 79.9999999999 thay vì 80.0). `decimal` an toàn tuyệt đối.
    /// </summary>
    [Range(0, 100, ErrorMessage = "Score must be between 0 and 100.")]
    public decimal Score { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thuộc tính lưu lời nhận xét chi tiết, góp ý chuyên môn của giảng viên cho học viên.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string. Nhận xét có thể để trống (null) nếu giảng viên chỉ chấm điểm nhanh, dù hệ thống khuyến khích luôn viết feedback.
    /// - `{ get; set; }`: Auto-property.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Là giá trị cốt lõi của khóa học MC: học viên cần nhận xét về phát âm, nhả chữ, giữ hơi, ngắt nhịp để tiến bộ.
    /// </summary>
    public string? Feedback { get; set; }
}

/// <summary>
/// DTO trả về thông tin chi tiết một lượt nộp bài nói, bao gồm thông tin bài học, kịch bản,
/// file audio, điểm số, giảng viên chấm và phân hạng kết quả.
/// </summary>
public class SpeakingSubmissionResponseDto
{
    /// <summary>
    /// [Dòng này làm gì]: Khai báo khóa chính (Primary Key) xác định duy nhất bản ghi bài nộp trong DB.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int`: Kiểu số nguyên 32-bit (System.Int32).
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int SubmissionId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của kịch bản nói liên kết (nếu bài tập này gắn với một kịch bản cụ thể).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int?`: Nullable int, mang giá trị null nếu bài nộp là bài nói tự do không theo kịch bản có sẵn.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int? ScriptId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo tiêu đề kịch bản nói để hiển thị trực tiếp lên giao diện học tập.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string, tránh lỗi nếu ScriptId là null hoặc kịch bản không có tiêu đề.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? ScriptTitle { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo phạm vi đánh giá của bài nộp (ví dụ: LESSON, CHAPTER, hoặc FINAL).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi ký tự.
    /// - `{ get; set; }`: Auto-property.
    /// - `= "FINAL";`: Giá trị mặc định là "FINAL" nếu không được gán tường minh.
    /// </summary>
    public string Scope { get; set; } = "FINAL";

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của bài học chứa bài nộp speaking này.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int?`: Nullable int, mang giá trị null nếu nộp theo bài thi tổng kết khóa (Final Exam) độc lập ngoài bài học.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo tên tiêu đề của bài học để hiển thị trên UI kết quả học tập.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định tránh cảnh báo CS8618 của Nullable Reference Types.
    /// </summary>
    public string LessonTitle { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của khóa học sở hữu bài tập nói.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int`: Kiểu số nguyên 32-bit.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int CourseId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo tên của khóa học.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng chuẩn convention C#.
    /// </summary>
    public string CourseTitle { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo đường dẫn thân thiện SEO (slug) của khóa học, dùng cho Client điều hướng URL.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string, cho phép null nếu khóa học chưa có slug.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? CourseSlug { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID chương/học phần (Module/Chapter) chứa bài học.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int?`: Nullable int.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int? ModuleId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo tiêu đề chương/học phần.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? ModuleTitle { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của học viên đã thực hiện bài nộp.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int`: Kiểu số nguyên 32-bit đại diện cho UserId trong bảng Users.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int LearnerId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo họ và tên của học viên nộp bài.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string LearnerName { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo email của học viên nộp bài.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string LearnerEmail { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của giảng viên phụ trách khóa học/chấm bài.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int`: Kiểu số nguyên 32-bit.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int InstructorId { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo họ và tên của giảng viên phụ trách khóa học.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string InstructorName { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo đường dẫn URL file âm thanh bài nộp trên Cloudinary CDN để Client phát lại audio.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable chứa đường dẫn HTTPS.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string AudioUrl { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ghi chú của học viên khi nộp bài.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo trạng thái của bài nộp ("PENDING" - Đang chờ chấm, "GRADED" - Đã chấm xong).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string`: Kiểu chuỗi non-nullable.
    /// - `{ get; set; }`: Auto-property.
    /// - `= string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Khai báo điểm số bài nộp do giảng viên chấm (null nếu bài ở trạng thái PENDING chưa chấm).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `decimal?`: Nullable decimal. Nếu chưa chấm thì mang giá trị null, tránh việc gán nhầm thành 0 điểm làm ảnh hưởng học bạ của học viên.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public decimal? Score { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo lời nhận xét, góp ý chi tiết từ người chấm.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string, mang giá trị null khi bài chưa được chấm.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? Feedback { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo ID của người dùng đã thực hiện hành động chấm điểm (Giảng viên hoặc Quản trị viên).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `int?`: Nullable int, mang giá trị null khi chưa có ai chấm.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public int? GradedById { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo họ và tên của người đã chấm điểm bài nộp.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `string?`: Nullable string.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public string? GradedByName { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thời điểm hoàn tất chấm điểm (theo chuẩn UTC).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `DateTime?`: Nullable DateTime, mang giá trị null khi chưa được chấm.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public DateTime? GradedAt { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thời điểm học viên gửi bài nộp lên hệ thống (theo chuẩn UTC).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `DateTime`: Value type lưu trữ ngày giờ chính xác của hành động nộp bài.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public DateTime SubmittedAt { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Khai báo thời điểm cập nhật bản ghi gần nhất (ví dụ khi sửa nhận xét hoặc điểm).
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `DateTime`: Value type lưu ngày giờ cập nhật cuối cùng.
    /// - `{ get; set; }`: Auto-property.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // ====================================================================================================
    // [LOGIC NGHIỆP VỤ TỰ ĐỘNG TÍNH TOÁN (COMPUTED / DERIVED PROPERTIES)]:
    // - IsPassed: Tự động suy luận trạng thái Đạt/Không đạt dựa trên quy chế đào tạo (Điểm chuẩn >= 80).
    // - GradeTier: Phân hạng chất lượng giọng nói phục vụ khen thưởng hoặc phân loại học tập.
    // ====================================================================================================

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Thuộc tính dẫn xuất tính toán tự động xem bài nộp có đạt chuẩn đầu ra (Passing grade) hay không.
    /// [Giải phẫu từng từ khóa & toán tử]:
    /// - `public`: Cho phép Client và các tầng khác đọc kết quả đánh giá.
    /// - `bool?`: Nullable boolean. Có 3 trạng thái khả dĩ: true (Đạt), false (Chưa đạt), null (Chưa chấm điểm).
    /// - `=>`: Expression-bodied property (cú pháp rút gọn thay cho khối `{ get { return ...; } }`).
    /// - `Score.HasValue`: Kiểm tra thuộc tính nullable decimal Score có mang giá trị số thực hay đang là null.
    /// - `? ... : ...`: Toán tử điều kiện 3 ngôi (Ternary operator).
    ///   - Nhánh TRUE (Khi `Score.HasValue == true`): Thực hiện biểu thức so sánh `Score.Value >= 80`.
    ///     Nếu điểm >= 80 thì trả về `true` (Đạt chuẩn); nếu điểm &lt; 80 thì trả về `false` (Không đạt).
    ///   - Nhánh FALSE (Khi `Score.HasValue == false`): Trả về `null`, báo hiệu bài nộp đang chờ giảng viên chấm.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Tập trung hóa quy tắc nghiệp vụ "Điểm đạt >= 80" ngay tại model, tránh việc Frontend hay nhiều Service phải hardcode lặp lại số 80.
    /// - Dùng `bool?` chuẩn hóa 3 trạng thái rõ ràng, tránh hiển thị sai lệch thành "Không đạt" cho các bài mới nộp đang chờ chấm.
    /// </summary>
    public bool? IsPassed => Score.HasValue ? Score.Value >= 80 : null;

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Thuộc tính dẫn xuất trả về danh hiệu xếp loại học tập dựa trên điểm số (Xuất sắc, Giỏi, Cần cải thiện, Trung bình, Yếu).
    /// [Giải phẫu từng từ khóa & toán tử]:
    /// - `public`: Cho phép truy cập công khai.
    /// - `string?`: Chuỗi nullable. Trả về tên danh hiệu nếu đã chấm điểm, hoặc null nếu chưa có điểm.
    /// - `=>`: Expression-bodied getter.
    /// - `Score.HasValue ? GetGradeTier(Score.Value) : null`:
    ///   - Nếu `Score.HasValue == true`: Gọi hàm tĩnh `GetGradeTier(Score.Value)` truyền điểm số thực tế để tính toán xếp loại.
    ///   - Nếu `Score.HasValue == false`: Trả về `null`.
    /// </summary>
    public string? GradeTier => Score.HasValue ? GetGradeTier(Score.Value) : null;

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích tĩnh (static helper) phân loại học lực theo các thang điểm chuẩn của trung tâm đào tạo MC:
    ///   - Bước 1: Kiểm tra xem điểm có đạt mức Xuất sắc (>= 95) không. Nếu có, trả về "Xuất sắc".
    ///   - Bước 2: Kiểm tra xem điểm có đạt mức Giỏi (>= 80) không. Nếu có, trả về "Giỏi".
    ///   - Bước 3: Kiểm tra xem điểm có đạt mức Cần cải thiện (>= 50) không. Nếu có, trả về "Cần cải thiện".
    ///   - Bước 4: Kiểm tra xem điểm có đạt mức Trung bình (>= 30) không. Nếu có, trả về "Trung bình".
    ///   - Bước 5: Nếu dưới 30 điểm, trả về "Yếu".
    /// [Giải phẫu từng từ khóa & tham số]:
    /// - `public`: Cho phép gọi từ bất kỳ đâu, kể cả Unit Test và các tầng khác.
    /// - `static`: Phương thức tĩnh, thuộc cấp độ lớp (Class-level), gọi trực tiếp qua tên class `SpeakingSubmissionResponseDto.GetGradeTier(...)` mà không cần cấp phát instance.
    /// - `string`: Kiểu trả về là chuỗi danh hiệu tiếng Việt có dấu.
    /// - `decimal score`: Tham số đầu vào biểu diễn điểm số thực tế (thang điểm 0 - 100).
    /// </summary>
    /// <param name="score">Điểm số thực tế từ 0 đến 100 của bài nộp.</param>
    /// <returns>Chuỗi xếp loại tiếng Việt tương ứng với thang điểm chuẩn.</returns>
    public static string GetGradeTier(decimal score)
    {
        // [NHÁNH 1]: Kiểm tra mức điểm Xuất sắc (95 - 100)
        // - Điều kiện: `score >= 95` (Điểm từ 95 trở lên).
        // - Nghiệp vụ: Dành cho học viên có ngữ điệu hoàn hảo, nhả chữ điêu luyện, chuẩn phong thái MC chuyên nghiệp.
        // - Luồng chạy: Nếu TRUE, lập tức return "Xuất sắc" và kết thúc hàm, không xét tiếp các điều kiện bên dưới.
        if (score >= 95) return "Xuất sắc";

        // [NHÁNH 2]: Kiểm tra mức điểm Giỏi (80 - cận 95)
        // - Điều kiện: `score >= 80` (Điểm từ 80 đến dưới 95 do nhánh 1 đã loại trừ >= 95).
        // - Nghiệp vụ: Đạt chuẩn điểm qua môn (Passing score threshold) của hệ thống đào tạo MSEEK, đủ điều kiện mở khóa bài tiếp theo.
        // - Luồng chạy: Nếu TRUE, lập tức return "Giỏi" và thoát hàm.
        if (score >= 80) return "Giỏi";

        // [NHÁNH 3]: Kiểm tra mức điểm Cần cải thiện (50 - cận 80)
        // - Điều kiện: `score >= 50` (Điểm từ 50 đến dưới 80).
        // - Nghiệp vụ: Học viên đã có cố gắng nhưng còn vấp, phát âm chưa chuẩn hoặc ngắt nhịp sai, chưa đủ điểm qua môn.
        // - Luồng chạy: Nếu TRUE, lập tức return "Cần cải thiện" và thoát hàm.
        if (score >= 50) return "Cần cải thiện";

        // [NHÁNH 4]: Kiểm tra mức điểm Trung bình (30 - cận 50)
        // - Điều kiện: `score >= 30` (Điểm từ 30 đến dưới 50).
        // - Nghiệp vụ: Giọng đọc thiếu tự tin, đều đều, phát âm sai nhiều từ khóa quan trọng trong kịch bản.
        // - Luồng chạy: Nếu TRUE, lập tức return "Trung bình" và thoát hàm.
        if (score >= 30) return "Trung bình";

        // [NHÁNH 5]: Trường hợp còn lại (dưới 30 điểm)
        // - Nghiệp vụ: Không đạt yêu cầu tối thiểu, học viên cần luyện tập lại nhiều lần từ các bài học cơ bản.
        // - Luồng chạy: Trả về "Yếu" làm giá trị mặc định cho tất cả các mức điểm &lt; 30.
        return "Yếu";
    }
}
