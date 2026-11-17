// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa mô hình truyền tải tiến độ học tập giữa Client và Backend.
//   Hỗ trợ theo dõi tiến trình của từng bài học và toàn bộ khóa học.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp dữ liệu chi tiết về % hoàn thành khóa học, số bài học đã học/tổng số bài.
// - Ghi nhận trạng thái hoàn thành bài học, vị trí dừng video phát dở (LastPositionSeconds),
//   và tổng thời gian học viên đã bỏ ra (TimeSpentSeconds) để tính toán streak & phân tích hành vi.
// - Kích hoạt điều kiện cấp chứng chỉ khi tiến độ đạt 100%.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client Player: Gửi sự kiện định kỳ (heartbeat) hoặc khi xem hết video tới LearningController -> UpdateLessonProgress.
// - Service: LearningProgressService xử lý logic cập nhật bảng LessonProgress, tính lại % hoàn thành khóa học trên Enrollment.
// - Database: Bảng LessonProgress, Enrollments, Lessons, Courses.
// ====================================================================================================

using System;
using System.Collections.Generic;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO tổng hợp tiến độ học tập của một học viên trong toàn bộ một khóa học cụ thể.
/// </summary>
public class CourseLearningProgressDto
{
    // [Dòng này làm gì]: Lưu ID của khóa học đang theo dõi tiến độ.
    // [Giải phẫu từng từ khóa]: `public int CourseId { get; set; }` - Số nguyên 32-bit công khai.
    public int CourseId { get; set; }

    // [Dòng này làm gì]: Lưu tên đầy đủ của khóa học để hiển thị trên thanh tiêu đề trang học tập.
    // [Giải phẫu từng từ khóa]: `public string CourseTitle { get; set; } = string.Empty;` - Khởi tạo chuỗi rỗng an toàn null.
    public string CourseTitle { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu ID của bản ghi ghi danh (EnrollmentId) của học viên với khóa học.
    // [Giải phẫu từng từ khóa]: `public int EnrollmentId { get; set; }` - Khóa ngoại liên kết bảng Enrollments.
    public int EnrollmentId { get; set; }

    // [Dòng này làm gì]: Lưu tỷ lệ hoàn thành khóa học tổng thể (từ 0.00% đến 100.00%).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Bộc lộ thuộc tính ra ngoài.
    //   - `decimal`: Kiểu số thực 128-bit độ chính xác cao trong C#, không bị lỗi sai số dấu phẩy động như double/float.
    //   - `CompletionPercentage`: Thuộc tính được tính toán tự động dựa trên tổng số bài học, quiz và bài thi nói đã đạt.
    //   - `{ get; set; }`: Getter/Setter.
    public decimal CompletionPercentage { get; set; }

    // [Dòng này làm gì]: Cờ boolean xác định học viên đã hoàn thành 100% nội dung khóa học và đủ điều kiện tốt nghiệp hay chưa.
    // [Giải phẫu từng từ khóa]:
    //   - `public bool IsCompleted { get; set; }`: Nhận giá trị `true` khi `CompletionPercentage >= 100.00m` và thỏa mãn điều kiện chứng chỉ.
    public bool IsCompleted { get; set; }

    // [Dòng này làm gì]: Lưu tổng số lượng bài học mà học viên đã hoàn thành (IsCompleted == true).
    // [Giải phẫu từng từ khóa]: `public int CompletedLessonsCount { get; set; }` - Số nguyên 32-bit.
    public int CompletedLessonsCount { get; set; }

    // [Dòng này làm gì]: Lưu tổng số lượng bài học đang có hiệu lực (ACTIVE) trong toàn bộ khóa học.
    // [Giải phẫu từng từ khóa]: `public int TotalLessonsCount { get; set; }` - Số nguyên 32-bit.
    public int TotalLessonsCount { get; set; }

    // [Dòng này làm gì]: Lưu ID của chứng chỉ tốt nghiệp nếu khóa học đã hoàn tất và đã được phát hành chứng chỉ.
    // [Giải phẫu từng từ khóa]:
    //   - `public int? CertificateId { get; set; }`: Kiểu số nguyên cho phép null (`int?`). Mang giá trị null nếu học viên chưa hoàn thành hoặc chưa được cấp chứng chỉ.
    public int? CertificateId { get; set; }

    // [Dòng này làm gì]: Lưu mã tra cứu duy nhất của chứng chỉ (ví dụ: "CERT-2026-X1Y2Z3").
    // [Giải phẫu từng từ khóa]:
    //   - `public string? CertificateCode { get; set; }`: Chuỗi ký tự cho phép null (`string?`).
    public string? CertificateCode { get; set; }

    // [Dòng này làm gì]: Lưu danh sách chi tiết tiến độ của từng bài học con bên trong khóa học.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Công khai.
    //   - `List<LessonProgressDto>`: Kiểu danh sách Generic tập hợp các đối tượng tiến độ bài học.
    //   - `LessonProgresses`: Tên thuộc tính danh sách tiến độ.
    //   - `{ get; set; }`: Getter/Setter.
    //   - `= new();`: Cú pháp Target-typed new khởi tạo danh sách rỗng, bảo đảm thuộc tính không bao giờ bị null khi trả JSON về Frontend.
    public List<LessonProgressDto> LessonProgresses { get; set; } = new();
}

/// <summary>
/// DTO biểu diễn tiến độ học tập chi tiết của học viên đối với một bài học đơn lẻ.
/// </summary>
public class LessonProgressDto
{
    // [Dòng này làm gì]: Lưu ID của bài học tương ứng (Primary Key bảng Lessons).
    // [Giải phẫu từng từ khóa]: `public int LessonId { get; set; }`
    public int LessonId { get; set; }

    // [Dòng này làm gì]: Đánh dấu bài học này đã được học viên hoàn thành (xem xong video/làm xong bài tập) hay chưa.
    // [Giải phẫu từng từ khóa]: `public bool IsCompleted { get; set; }`
    public bool IsCompleted { get; set; }

    // [Dòng này làm gì]: Lưu vị trí giây dừng video gần nhất (Resume Video Position).
    // [Giải phẫu từng từ khóa]:
    //   - `public int LastPositionSeconds { get; set; }`: Số nguyên lưu thời lượng phát video tính bằng giây (ví dụ: 125 giây tương đương phút 2:05).
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Khi học viên đổi thiết bị từ điện thoại sang máy tính hoặc tải lại trang, trình phát video đọc thuộc tính này để nhảy ngay tới thời điểm đang xem dở, nâng cao UX.
    public int LastPositionSeconds { get; set; }

    // [Dòng này làm gì]: Lưu tổng số giây thực tế học viên đã tích lũy tương tác/học bài học này.
    // [Giải phẫu từng từ khóa]: `public int TimeSpentSeconds { get; set; }` - Số giây tích lũy.
    public int TimeSpentSeconds { get; set; }

    // [Dòng này làm gì]: Lưu tổng thời gian học quy đổi ra phút để tiện hiển thị trên báo cáo thống kê.
    // [Giải phẫu từng từ khóa]: `public int TimeSpentMinutes { get; set; }` - Được tính bằng `TimeSpentSeconds / 60`.
    public int TimeSpentMinutes { get; set; }

    // [Dòng này làm gì]: Lưu thời điểm gần đây nhất học viên mở hoặc tương tác với bài học này.
    // [Giải phẫu từng từ khóa]:
    //   - `public DateTime? LastAccessedAt { get; set; }`: Cấu trúc DateTime cho phép null (`DateTime?`). Null nếu học viên chưa từng click vào bài học.
    public DateTime? LastAccessedAt { get; set; }

    // [Dòng này làm gì]: Lưu thời điểm chính xác học viên hoàn thành bài học này.
    // [Giải phẫu từng từ khóa]:
    //   - `public DateTime? CompletedAt { get; set; }`: Cấu trúc DateTime cho phép null (`DateTime?`). Null nếu bài học chưa hoàn thành.
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu yêu cầu cập nhật tiến độ học của một bài học từ Client player gửi lên.
/// </summary>
public class UpdateLessonProgressRequest
{
    // [Dòng này làm gì]: Cờ đánh dấu hoàn thành bài học gửi từ trình phát video (true khi video chạy đến 95-100% hoặc học viên bấm nút "Đã học xong").
    // [Giải phẫu từng từ khóa]:
    //   - `public bool? IsCompleted { get; set; }`: Cho phép null (`bool?`). Nếu null nghĩa là request này chỉ cập nhật vị trí video (heartbeat) mà không làm thay đổi trạng thái hoàn thành hiện tại.
    public bool? IsCompleted { get; set; }

    // [Dòng này làm gì]: Vị trí hiện tại của video player tính bằng giây.
    // [Giải phẫu từng từ khóa]:
    //   - `public int? LastPositionSeconds { get; set; }`: Cho phép null (`int?`). Nếu client chỉ muốn đánh dấu hoàn thành mà không cập nhật vị trí thì truyền null.
    public int? LastPositionSeconds { get; set; }

    // [Dòng này làm gì]: Số giây học tích lũy mới hoặc số giây gia tăng thêm từ lần gửi tín hiệu gần nhất.
    // [Giải phẫu từng từ khóa]:
    //   - `public int? TimeSpentSeconds { get; set; }`: Cho phép null (`int?`).
    public int? TimeSpentSeconds { get; set; }
}
