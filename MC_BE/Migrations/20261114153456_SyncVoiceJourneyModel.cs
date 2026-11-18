
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class SyncVoiceJourneyModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Các bảng Voice Journey đã tồn tại trên Production.
            // Không tạo lại bảng để tránh lỗi:
            // relation already exists.
            //
            // Phần bổ sung schema còn thiếu được xử lý
            // trong Migration AddVoiceJourneyAndAiEntitlements.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không xóa bảng và dữ liệu Voice Journey
            // khi rollback Migration này.
        }
    }
}
