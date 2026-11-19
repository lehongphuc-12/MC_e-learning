
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa dữ liệu nộp bài nói từ học viên, bao gồm file ghi âm dạng nhị phân và ghi chú kèm theo.
/// </summary>
public class CreateSpeakingSubmissionRequest
{
    /// <summary>ID của bài học (Lesson) mà học viên đang nộp bài nói.</summary>
    ///   Ý nghĩa nghiệp vụ: Nếu bài nộp gắn với bài học cụ thể thì có giá trị; nếu nộp bài theo kịch bản độc lập (ScriptId) thì mang giá trị null.
    /// - `{ get; set; }`: Auto-implemented property, hỗ trợ đọc và gán giá trị tự động từ FormData multipart request.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Hệ thống MSEEK hỗ trợ 2 hình thức nộp bài: nộp theo bài học trong lộ trình hoặc nộp kịch bản tự do.
    /// - Nếu dùng `int` thông thường (non-nullable), giá trị mặc định là 0, Model Binder sẽ không phân biệt được người dùng không truyền hay truyền giá trị 0.
    /// [Cách viết thay thế & So sánh]:
    /// - Dùng `int LessonId`: Buộc mọi bài nộp phải có bài học, làm mất tính linh hoạt khi nộp kịch bản tổng quát.
    /// </summary>
    public int? LessonId { get; set; }
    /// <summary>ID của kịch bản nói (SpeakingScript) mà học viên chọn để luyện tập.</summary>
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Cho phép học viên chọn kịch bản mẫu từ thư viện kịch bản để thu âm.
    /// - Rủi ro: Nếu thiếu scriptId lẫn lessonId, tầng Service sẽ kiểm tra và từ chối xử lý (BadRequest).
    /// [Cách viết thay thế & So sánh]:
    /// - Bắt buộc `int ScriptId`: Sẽ gây bất tiện nếu bài học chỉ có 1 script duy nhất gắn kèm trong DB.
    /// </summary>
    public int? ScriptId { get; set; }
    /// <summary>file âm thanh thu âm (.mp3, .wav) được upload trực tiếp từ thiết bị của học viên.</summary>
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
    /// Ghi chú của học viên khi nộp bài.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Cấp độ kịch bản mà học viên chọn để luyện tập ("BEGINNER", "INTERMEDIATE", "ADVANCED").
    /// </summary>
    public string? SelectedLevel { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu chấm điểm và nhận xét của giảng viên dành cho một bài nộp Speaking.
/// </summary>
public class GradeSpeakingSubmissionRequest
{
    /// <summary>điểm số đánh giá bài nói do giảng viên chấm, theo thang điểm 100.</summary>
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
    /// <summary>lời nhận xét chi tiết, góp ý chuyên môn của giảng viên cho học viên.</summary>
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Là giá trị cốt lõi của khóa học MC: học viên cần nhận xét về phát âm, nhả chữ, giữ hơi, ngắt nhịp để tiến bộ.
    /// </summary>
    public string? Feedback { get; set; }

    /// <summary>
    /// Danh sách điểm số chi tiết từng tiêu chí Rubric (nếu giảng viên chấm theo rubric).
    /// </summary>
    public List<CriterionScoreDto>? CriterionScores { get; set; }
}

/// <summary>
/// DTO chứa điểm thành phần theo từng tiêu chí chấm điểm (Rubric).
/// </summary>
public class CriterionScoreDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
}

/// <summary>
/// DTO trả về kết quả điểm của từng tiêu chí Rubric trong bài nộp của học viên.
/// </summary>
public class SubmissionCriterionScoreDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
}

/// <summary>
/// DTO tóm tắt lịch sử một lượt nộp bài Speaking của học viên.
/// </summary>
public class SpeakingSubmissionHistoryDto
{
    public int SubmissionId { get; set; }
    public int? ScriptId { get; set; }
    public int? LessonId { get; set; }
    public int AttemptNumber { get; set; }
    public decimal? Score { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool? IsPassed => Score.HasValue ? Score.Value >= 80 : null;
    public string? GradeTier => Score.HasValue ? SpeakingSubmissionResponseDto.GetGradeTier(Score.Value) : null;
    public DateTime SubmittedAt { get; set; }
    public DateTime? GradedAt { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string? SelectedLevel { get; set; }
}

/// <summary>
/// DTO trả về thông tin chi tiết một lượt nộp bài nói, bao gồm thông tin bài học, kịch bản,
/// file audio, điểm số, giảng viên chấm và phân hạng kết quả.
/// </summary>
public class SpeakingSubmissionResponseDto
{
    /// <summary>khóa chính (Primary Key) xác định duy nhất bản ghi bài nộp trong DB.</summary>
    public int SubmissionId { get; set; }
    /// <summary>ID của kịch bản nói liên kết (nếu bài tập này gắn với một kịch bản cụ thể).</summary>
    public int? ScriptId { get; set; }
    /// <summary>tiêu đề kịch bản nói để hiển thị trực tiếp lên giao diện học tập.</summary>
    public string? ScriptTitle { get; set; }
    /// <summary>phạm vi đánh giá của bài nộp (ví dụ: LESSON, CHAPTER, hoặc FINAL).</summary>
    public string Scope { get; set; } = "FINAL";
    /// <summary>ID của bài học chứa bài nộp speaking này.</summary>
    public int? LessonId { get; set; }
    /// <summary>tên tiêu đề của bài học để hiển thị trên UI kết quả học tập.</summary>
    public string LessonTitle { get; set; } = string.Empty;
    /// <summary>ID của khóa học sở hữu bài tập nói.</summary>
    public int CourseId { get; set; }
    /// <summary>tên của khóa học.</summary>
    public string CourseTitle { get; set; } = string.Empty;
    /// <summary>đường dẫn thân thiện SEO (slug) của khóa học, dùng cho Client điều hướng URL.</summary>
    public string? CourseSlug { get; set; }
    /// <summary>ID chương/học phần (Module/Chapter) chứa bài học.</summary>
    public int? ModuleId { get; set; }
    /// <summary>tiêu đề chương/học phần.</summary>
    public string? ModuleTitle { get; set; }
    /// <summary>ID của học viên đã thực hiện bài nộp.</summary>
    public int LearnerId { get; set; }
    /// <summary>họ và tên của học viên nộp bài.</summary>
    public string LearnerName { get; set; } = string.Empty;
    /// <summary>email của học viên nộp bài.</summary>
    public string LearnerEmail { get; set; } = string.Empty;
    /// <summary>ID của giảng viên phụ trách khóa học/chấm bài.</summary>
    public int InstructorId { get; set; }
    /// <summary>họ và tên của giảng viên phụ trách khóa học.</summary>
    public string InstructorName { get; set; } = string.Empty;
    /// <summary>đường dẫn URL file âm thanh bài nộp trên Cloudinary CDN để Client phát lại audio.</summary>
    public string AudioUrl { get; set; } = string.Empty;
    /// <summary>ghi chú của học viên khi nộp bài.</summary>
    public string? Note { get; set; }
    /// <summary>trạng thái của bài nộp ("PENDING" - Đang chờ chấm, "GRADED" - Đã chấm xong).</summary>
    public string Status { get; set; } = string.Empty;
    /// <summary>điểm số bài nộp do giảng viên chấm (null nếu bài ở trạng thái PENDING chưa chấm).</summary>
    public decimal? Score { get; set; }
    /// <summary>lời nhận xét, góp ý chi tiết từ người chấm.</summary>
    public string? Feedback { get; set; }
    /// <summary>ID của người dùng đã thực hiện hành động chấm điểm (Giảng viên hoặc Quản trị viên).</summary>
    public int? GradedById { get; set; }
    /// <summary>họ và tên của người đã chấm điểm bài nộp.</summary>
    public string? GradedByName { get; set; }
    /// <summary>thời điểm hoàn tất chấm điểm (theo chuẩn UTC).</summary>
    public DateTime? GradedAt { get; set; }
    /// <summary>thời điểm học viên gửi bài nộp lên hệ thống (theo chuẩn UTC).</summary>
    public DateTime SubmittedAt { get; set; }
    /// <summary>thời điểm cập nhật bản ghi gần nhất (ví dụ khi sửa nhận xét hoặc điểm).</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Cấp độ kịch bản mà học viên đã chọn luyện tập ("BEGINNER", "INTERMEDIATE", "ADVANCED").
    /// </summary>
    public string? SelectedLevel { get; set; }

    /// <summary>
    /// Lần nộp thứ mấy của học viên đối với bài tập này (1, 2, 3...).
    /// </summary>
    public int AttemptNumber { get; set; } = 1;

    /// <summary>
    /// Tổng số lần học viên đã nộp bài này.
    /// </summary>
    public int TotalAttempts { get; set; } = 1;

    /// <summary>
    /// Ngưỡng điểm đạt của bài tập nói (mặc định 80/100).
    /// </summary>
    public decimal PassingScore { get; set; } = 80m;

    /// <summary>
    /// Danh sách tiêu chí chấm điểm (Rubric Criteria) đã được cấu hình cho kịch bản của bài tập này.
    /// </summary>
    public List<SpeakingRubricCriterionDto> RubricCriteria { get; set; } = new();

    /// <summary>
    /// Chi tiết điểm từng tiêu chí Rubric mà giảng viên đã chấm.
    /// </summary>
    public List<SubmissionCriterionScoreDto> CriterionScores { get; set; } = new();
    // [LOGIC NGHIỆP VỤ TỰ ĐỘNG TÍNH TOÁN (COMPUTED / DERIVED PROPERTIES)]:
    // - IsPassed: Tự động suy luận trạng thái Đạt/Không đạt dựa trên quy chế đào tạo (Điểm chuẩn >= 80).
    // - GradeTier: Phân hạng chất lượng giọng nói phục vụ khen thưởng hoặc phân loại học tập.

    /// <summary>
    /// - Thuộc tính dẫn xuất tính toán tự động xem bài nộp có đạt chuẩn đầu ra (Passing grade) hay không.
    ///     Nếu điểm >= 80 thì trả về `true` (Đạt chuẩn); nếu điểm &lt; 80 thì trả về `false` (Không đạt).
    ///   - Nhánh FALSE (Khi `Score.HasValue == false`): Trả về `null`, báo hiệu bài nộp đang chờ giảng viên chấm.
    /// [Tại sao phải dùng & Rủi ro nếu thiếu]:
    /// - Tập trung hóa quy tắc nghiệp vụ "Điểm đạt >= 80" ngay tại model, tránh việc Frontend hay nhiều Service phải hardcode lặp lại số 80.
    /// - Dùng `bool?` chuẩn hóa 3 trạng thái rõ ràng, tránh hiển thị sai lệch thành "Không đạt" cho các bài mới nộp đang chờ chấm.
    /// </summary>
    public bool? IsPassed => Score.HasValue ? Score.Value >= 80 : null;

    /// <summary>
    /// - Thuộc tính dẫn xuất trả về danh hiệu xếp loại học tập dựa trên điểm số (Xuất sắc, Giỏi, Cần cải thiện, Trung bình, Yếu).
    /// </summary>
    public string? GradeTier => Score.HasValue ? GetGradeTier(Score.Value) : null;

    /// <summary>
    /// - Hàm tiện ích tĩnh (static helper) phân loại học lực theo các thang điểm chuẩn của trung tâm đào tạo MC:
    ///   - Bước 1: Kiểm tra xem điểm có đạt mức Xuất sắc (>= 95) không. Nếu có, trả về "Xuất sắc".
    ///   - Bước 2: Kiểm tra xem điểm có đạt mức Giỏi (>= 80) không. Nếu có, trả về "Giỏi".
    ///   - Bước 3: Kiểm tra xem điểm có đạt mức Cần cải thiện (>= 50) không. Nếu có, trả về "Cần cải thiện".
    ///   - Bước 4: Kiểm tra xem điểm có đạt mức Trung bình (>= 30) không. Nếu có, trả về "Trung bình".
    ///   - Bước 5: Nếu dưới 30 điểm, trả về "Yếu".
    /// </summary>
    /// <param name="score">Điểm số thực tế từ 0 đến 100 của bài nộp.</param>
    /// <returns>Chuỗi xếp loại tiếng Việt tương ứng với thang điểm chuẩn.</returns>
    public static string GetGradeTier(decimal score)
    {
        // [NHÁNH 1]: Kiểm tra mức điểm Xuất sắc (95 - 100)
        // - Nghiệp vụ: Dành cho học viên có ngữ điệu hoàn hảo, nhả chữ điêu luyện, chuẩn phong thái MC chuyên nghiệp.
        // - Luồng chạy: Nếu TRUE, lập tức return "Xuất sắc" và kết thúc hàm, không xét tiếp các điều kiện bên dưới.
        if (score >= 95) return "Xuất sắc";

        // [NHÁNH 2]: Kiểm tra mức điểm Giỏi (80 - cận 95)
        // - Nghiệp vụ: Đạt chuẩn điểm qua môn (Passing score threshold) của hệ thống đào tạo MSEEK, đủ điều kiện mở khóa bài tiếp theo.
        // - Luồng chạy: Nếu TRUE, lập tức return "Giỏi" và thoát hàm.
        if (score >= 80) return "Giỏi";

        // [NHÁNH 3]: Kiểm tra mức điểm Cần cải thiện (50 - cận 80)
        // - Nghiệp vụ: Học viên đã có cố gắng nhưng còn vấp, phát âm chưa chuẩn hoặc ngắt nhịp sai, chưa đủ điểm qua môn.
        // - Luồng chạy: Nếu TRUE, lập tức return "Cần cải thiện" và thoát hàm.
        if (score >= 50) return "Cần cải thiện";

        // [NHÁNH 4]: Kiểm tra mức điểm Trung bình (30 - cận 50)
        // - Nghiệp vụ: Giọng đọc thiếu tự tin, đều đều, phát âm sai nhiều từ khóa quan trọng trong kịch bản.
        // - Luồng chạy: Nếu TRUE, lập tức return "Trung bình" và thoát hàm.
        if (score >= 30) return "Trung bình";

        // [NHÁNH 5]: Trường hợp còn lại (dưới 30 điểm)
        // - Nghiệp vụ: Không đạt yêu cầu tối thiểu, học viên cần luyện tập lại nhiều lần từ các bài học cơ bản.
        // - Luồng chạy: Trả về "Yếu" làm giá trị mặc định cho tất cả các mức điểm &lt; 30.
        return "Yếu";
    }
}
