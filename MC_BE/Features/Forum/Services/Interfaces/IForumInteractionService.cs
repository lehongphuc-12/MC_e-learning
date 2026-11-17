// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Abstraction (Interface) trong Application Core / Business Logic Layer.
// - Nằm trong module: Features/Forum/Services/Interfaces.
// - Vai trò: Định nghĩa hợp đồng nghiệp vụ cho các tương tác xã hội (Social Interactions) và Kiểm duyệt cộng đồng
//   trên diễn đàn MSEEK bao gồm: Thả cảm xúc (Reactions) và Báo cáo vi phạm (Reports).
// - Nguyên lý: Dependency Inversion Principle (DIP). Phân tách rõ ràng giữa chức năng đăng bài/bình luận cốt lõi
//   với các tính năng tương tác phụ trợ nhằm tăng tính độc lập và giảm tải độ phức tạp của Service chính.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý trải nghiệm tương tác cộng đồng sinh động và văn minh:
//   1. Thả cảm xúc đa dạng (LIKE, LOVE, HELPFUL) hỗ trợ cả 2 đối tượng mục tiêu: Bài viết (POST) và Bình luận (COMMENT).
//   2. Cơ chế chuyển đổi cảm xúc (Toggle & Switch):
//      - Nếu chưa thả -> Thêm mới cảm xúc và tăng ReactionsCount.
//      - Nếu bấm lại đúng loại cảm xúc cũ -> Hủy cảm xúc (Unlike) và giảm ReactionsCount.
//      - Nếu bấm loại cảm xúc khác -> Cập nhật loại mới và giữ nguyên số lượng ReactionsCount.
//   3. Tiếp nhận báo cáo vi phạm (Spam, Quấy rối, Thông tin sai lệch) kèm kiểm tra chống spam báo cáo trùng lặp từ 1 tài khoản.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controllers: ForumPostsController và ForumCommentsController inject IForumInteractionService.
// - Triển khai: ForumInteractionService.
// - CSDL: Bảng ForumReactions, ForumReports, cập nhật số đếm trên ForumPosts và ForumComments.
// ====================================================================================================

using System.Threading.Tasks;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

/// <summary>
/// Giao diện định nghĩa các nghiệp vụ tương tác xã hội (Reactions) và Báo cáo vi phạm (Reports) trên diễn đàn.
/// </summary>
public interface IForumInteractionService
{
    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Thực hiện thả cảm xúc, thay đổi loại cảm xúc hoặc hủy cảm xúc trên Bài viết hoặc Bình luận.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Xác định đối tượng mục tiêu là POST hay COMMENT thông qua request.TargetType.</para>
    /// <para>Bước 2: Tìm kiếm bản ghi ForumReaction hiện có của userId trên đối tượng mục tiêu.</para>
    /// <para>Bước 3: Rẽ nhánh xử lý 3 trường hợp:</para>
    /// <para>  + Nhánh 1: Chưa có reaction -> Tạo mới, tăng ReactionsCount của Post/Comment.</para>
    /// <para>  + Nhánh 2: Đã có và trùng ReactionType -> Xóa bản ghi (Unlike), giảm ReactionsCount.</para>
    /// <para>  + Nhánh 3: Đã có nhưng khác ReactionType -> Cập nhật ReactionType mới, giữ nguyên ReactionsCount.</para>
    /// <para>Bước 4: Lưu thay đổi CSDL và trả về ForumReactionSummaryDto tổng hợp.</para>
    /// </summary>
    /// <param name="userId">ID người dùng đang thực hiện tương tác.</param>
    /// <param name="request">Payload chứa TargetType (POST/COMMENT), PostId/CommentId và ReactionType (LIKE, LOVE, HELPFUL).</param>
    /// <returns>ForumReactionSummaryDto chứa trạng thái IsReacted, ReactionType hiện tại và tổng số TotalReactions.</returns>
    Task<ForumReactionSummaryDto> ToggleReactionAsync(int userId, ToggleReactionRequest request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tiếp nhận đơn báo cáo vi phạm nội dung từ thành viên cộng đồng gửi tới Ban Quản trị.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Xác thực đối tượng bị báo cáo (Post hoặc Comment) có tồn tại trong CSDL hay không.</para>
    /// <para>Bước 2: Kiểm tra chống spam báo cáo: Nếu người dùng này đã từng gửi báo cáo cho nội dung này trước đó thì chặn lại.</para>
    /// <para>Bước 3: Khởi tạo bản ghi ForumReport với trạng thái PENDING và lưu vào CSDL.</para>
    /// <para>Bước 4: Tăng biến đếm ReportsCount của bài viết/bình luận tương ứng.</para>
    /// <para>Bước 5: Trả về true báo hiệu báo cáo thành công.</para>
    /// </summary>
    /// <param name="reporterId">ID của người gửi đơn báo cáo.</param>
    /// <param name="request">Payload chứa thông tin mục tiêu vi phạm, lý do (SPAM, HARASSMENT...) và chi tiết giải trình.</param>
    /// <returns>True nếu tạo báo cáo thành công, False nếu đối tượng không tồn tại hoặc đã bị báo cáo trước đó.</returns>
    Task<bool> CreateReportAsync(int reporterId, CreateReportRequest request);
}
