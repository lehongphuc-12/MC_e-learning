// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / N-Tier).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định hình cấu trúc dữ liệu truyền tải (Contract) giữa Backend và Frontend (Client)
//   nhằm hiển thị dòng thời gian nhật ký học tập (Learning Activity Timeline / Recent Activities) của học viên.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Trả về danh sách hoạt động học tập gần nhất của học sinh trên Dashboard cá nhân (ví dụ: "Đã hoàn thành bài học X",
//   "Đã nộp bài Speaking Y", "Đạt chứng chỉ Z").
// - Thiết kế sẵn các trường trực quan hóa (Emoji, Accent, Time hiển thị tương đối) giúp Client hiển thị ngay
//   mà không cần xử lý định dạng phức tạp.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Database: Bảng LessonProgress, SpeakingSubmissions, Certificates, ForumPosts, ForumComments, ForumReactions, Enrollments.
// - Service: LearningProgressService (hàm GetRecentActivitiesAsync) tổng hợp dữ liệu từ DB -> map sang ActivityLogDto.
// - Controller: LearningController -> HTTP GET api/learning/activity-logs.
// - Client: Nhận JSON array của ActivityLogDto để render danh sách hoạt động trên giao diện Learning Dashboard.
// ====================================================================================================

using System;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// Data Transfer Object đại diện cho một mẩu tin nhật ký hoạt động học tập gần đây của người dùng.
/// </summary>
public class ActivityLogDto
{
    // [Dòng này làm gì]: Khai báo thuộc tính lưu biểu tượng cảm xúc đại diện trực quan cho loại hoạt động học tập (ví dụ: ✅, 🏆, 🌟, 📝, 🎙️).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Access modifier (từ khóa chỉ định phạm vi truy cập công khai), cho phép các layer bên ngoài (Service, Controller) và bộ tuần tự hóa JSON (System.Text.Json) có thể đọc và ghi giá trị này khi chuyển đổi qua lại giữa C# Object và JSON string.
    //   - `string`: Kiểu dữ liệu chuỗi ký tự (reference type) đại diện cho văn bản Unicode (hỗ trợ ký tự Emoji đa byte UTF-16/UTF-8).
    //   - `Emoji`: Tên thuộc tính (Property identifier), tuân thủ quy tắc PascalCase trong C#.
    //   - `{ get; set; }`: Cú pháp Auto-Implemented Property. `get;` sinh ngầm trường backing-field và method getter để đọc dữ liệu; `set;` sinh method setter cho phép gán giá trị từ ngoài vào. Nếu thiếu `set;`, bộ tuần tự hóa JSON hoặc Mapper sẽ không thể nạp giá trị khi khởi tạo.
    //   - `= string.Empty;`: Biểu thức gán giá trị mặc định lúc khởi tạo object bằng chuỗi rỗng ("").
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Trong .NET 8/9 kích hoạt tính năng Nullable Reference Types (<Nullable>enable</Nullable>), kiểu `string` không được phép nhận giá trị `null`. Nếu không có `= string.Empty;`, trình biên dịch sẽ cảnh báo CS8618 (Non-nullable property must contain a non-null value when exiting constructor) và khi runtime nếu chưa gán giá trị, truy cập các hàm `.Length`, `.Trim()` sẽ gây crash hệ thống với lỗi NullReferenceException.
    // [Cách viết thay thế & So sánh]: Có thể dùng `public required string Emoji { get; set; }` (C# 11+ bắt buộc phải khởi tạo khi new object), hoặc `= "";` (string.Empty tối ưu hơn vì trỏ đến hằng số singleton chuỗi rỗng của CLR, không cấp phát thêm literal), hoặc `public string? Emoji { get; set; }` nếu chấp nhận null.
    public string Emoji { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo thuộc tính lưu chuỗi mô tả chi tiết nội dung hoạt động (ví dụ: "Completed 'Luyện giọng cơ bản' in Khóa học MC sự kiện").
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Bộc lộ thuộc tính ra ngoài phạm vi class để Controller và JSON Serializer đọc/ghi được.
    //   - `string`: Kiểu chuỗi ký tự UTF-16 lưu trữ nội dung văn bản thông báo.
    //   - `Text`: Tên định danh thuộc tính mang ý nghĩa mô tả hoạt động.
    //   - `{ get; set; }`: Cặp accessor getter/setter tự động của C#.
    //   - `= string.Empty;`: Khởi tạo chuỗi rỗng an toàn, triệt tiêu nguy cơ null pointer.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Tránh cảnh báo CS8618 của Roslyn Analyzer và bảo đảm Frontend luôn nhận về chuỗi hợp lệ (không bao giờ bị `null`), giúp code UI React/Vue render trực tiếp mà không cần check `item.text && item.text.length`.
    // [Cách viết thay thế & So sánh]: Dùng `public string Text { get; init; } = string.Empty;` nếu muốn biến này thành bất biến (immutable) sau khi khởi tạo, nhưng dùng `{ get; set; }` linh hoạt hơn cho nhiều mapper khác nhau.
    public string Text { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo thuộc tính lưu chuỗi thời gian đã được định dạng hiển thị tương đối (ví dụ: "5m ago", "2h ago", "3d ago").
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Công khai quyền truy cập cho mọi assembly và caller.
    //   - `string`: Kiểu chuỗi ký tự lưu mốc thời gian dạng chữ thân thiện với người dùng (human-readable format).
    //   - `Time`: Định danh thuộc tính đại diện cho thời gian tương đối.
    //   - `{ get; set; }`: Auto property cho phép gán giá trị sau khi tính toán khoảng cách thời gian giữa UtcNow và CreatedAt.
    //   - `= string.Empty;`: Giá trị khởi tạo chuỗi rỗng tránh lỗi dereference.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Giảm tải việc tính toán thời gian ở phía Client. Backend chuẩn hóa định dạng trước khi trả về, đảm bảo nhất quán giao diện giữa Web và Mobile App.
    // [Cách viết thay thế & So sánh]: Có thể bỏ trường `Time` này và chỉ trả về `DateTime CreatedAt` để Frontend tự dùng thư viện như `dayjs.fromNow()` hoặc `date-fns`. Tuy nhiên, việc cung cấp sẵn trường `Time` giúp API đáp ứng giao diện nhanh mà không ép Client cài thêm package nặng.
    public string Time { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo thuộc tính lưu mã màu/class CSS nhấn mạnh (Accent Color) để Frontend áp dụng style giao diện tương ứng với loại hoạt động (ví dụ: "text-blue-600 bg-blue-50").
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập công khai từ bên ngoài.
    //   - `string`: Chuỗi ký tự lưu danh sách class Tailwind CSS hoặc mã màu Hex.
    //   - `Accent`: Tên thuộc tính quy định phong cách hiển thị màu sắc.
    //   - `{ get; set; }`: Getter và Setter tự động.
    //   - `= string.Empty;`: Mặc định chuỗi rỗng.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Phục vụ thiết kế Server-Driven UI (SDUI) ở mức độ nhẹ. Backend quyết định sắc thái (hoàn thành bài học là xanh dương, chứng chỉ là vàng kim, đăng bài là chàm), giúp đổi giao diện mà không cần sửa code giao diện Client.
    // [Cách viết thay thế & So sánh]: Có thể dùng kiểu Enum (ví dụ: `ActivityAccent.Blue`) rồi Client tự map class CSS. Nhưng trả trực tiếp class chuỗi linh hoạt hơn khi cần đổi theme nhanh.
    public string Accent { get; set; } = string.Empty;

    // [Dòng này làm gì]: Khai báo thuộc tính lưu đường dẫn điều hướng trực tiếp (deep link) tới tài nguyên liên quan (ví dụ: "/courses/12/learn", "/profile").
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Phạm vi truy cập công khai.
    //   - `string?`: Kiểu chuỗi ký tự cho phép nhận giá trị `null` (Nullable Reference Type). Ký tự dấu hỏi `?` biểu thị rõ ràng với trình biên dịch rằng thuộc tính này có thể không có giá trị nếu hoạt động đó không có trang chi tiết để điều hướng đến.
    //   - `Link`: Tên định danh thuộc tính lưu URL tương đối hoặc tuyệt đối.
    //   - `{ get; set; }`: Getter và Setter tự động.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Khác với các trường trên, một số hoạt động có thể không có liên kết điều hướng. Dấu `?` giúp thể hiện đúng bản chất nghiệp vụ (optional field) và không gây cảnh báo CS8618 ngay cả khi không gán giá trị mặc định.
    // [Cách viết thay thế & So sánh]: Nếu viết `string Link` (không có `?`) mà gán `null`, trình biên dịch sẽ cảnh báo `CS8625: Cannot convert null literal to non-nullable reference type`.
    public string? Link { get; set; }

    // [Dòng này làm gì]: Khai báo thuộc tính lưu thời điểm chính xác hoạt động diễn ra theo chuẩn thời gian quốc tế UTC.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Phạm vi truy cập công khai.
    //   - `DateTime`: Kiểu cấu trúc dữ liệu giá trị (struct / value type) đại diện cho ngày và giờ trong .NET.
    //   - `CreatedAt`: Tên định danh thuộc tính lưu mốc thời gian tạo.
    //   - `{ get; set; }`: Getter và Setter tự động.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: `DateTime` là value type nên giá trị mặc định của nó là `default(DateTime)` (tương đương `0001-01-01T00:00:00`), không bao giờ bị `null`. Trường này dùng để sắp xếp dòng thời gian chính xác trên Backend (`.OrderByDescending(a => a.CreatedAt)`) trước khi phân trang hoặc cắt `Take(limit)`.
    // [Cách viết thay thế & So sánh]: Có thể dùng `DateTimeOffset` để lưu kèm độ lệch múi giờ (Time Zone Offset). Tuy nhiên, vì toàn bộ hệ thống MSEEK chuẩn hóa lưu UTC (`DateTime.UtcNow`) nên dùng `DateTime` là đủ chuẩn và gọn nhẹ.
    public DateTime CreatedAt { get; set; }
}
