using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class HardenEnrollmentPaymentCartFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions",
                column: "ProviderTransactionNo",
                unique: true,
                filter: "\"ProviderTransactionNo\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_LearnerID_CourseID",
                table: "enrollments",
                columns: new[] { "LearnerID", "CourseID" },
                unique: true,
                filter: "\"Status\" IN ('PENDING_PAYMENT', 'ACTIVE')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions");

            migrationBuilder.DropIndex(
                name: "IX_enrollments_LearnerID_CourseID",
                table: "enrollments");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions",
                column: "ProviderTransactionNo");
        }
    }
}
