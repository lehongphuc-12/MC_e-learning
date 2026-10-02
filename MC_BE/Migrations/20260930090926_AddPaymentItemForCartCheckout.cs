using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentItemForCartCheckout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payment_transactions_payments_PaymentID",
                table: "payment_transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_courses_CourseID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_enrollments_EnrollmentID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_users_LearnerID",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_enrollments_PaymentID",
                table: "enrollments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_payments",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_CourseID",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_EnrollmentID",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_Status",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "PaymentID",
                table: "enrollments");

            migrationBuilder.DropColumn(
                name: "CourseID",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "EnrollmentID",
                table: "payments");

            migrationBuilder.RenameTable(
                name: "payments",
                newName: "PAYMENT");

            migrationBuilder.RenameIndex(
                name: "IX_payments_MerchantTxnRef",
                table: "PAYMENT",
                newName: "IX_PAYMENT_MerchantTxnRef");

            migrationBuilder.RenameIndex(
                name: "IX_payments_LearnerID",
                table: "PAYMENT",
                newName: "IX_PAYMENT_LearnerID");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "PAYMENT",
                type: "integer",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PAYMENT",
                table: "PAYMENT",
                column: "PaymentID");

            migrationBuilder.CreateTable(
                name: "PAYMENT_ITEM",
                columns: table => new
                {
                    PaymentItemID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PaymentID = table.Column<int>(type: "integer", nullable: false),
                    EnrollmentID = table.Column<int>(type: "integer", nullable: false),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PAYMENT_ITEM", x => x.PaymentItemID);
                    table.ForeignKey(
                        name: "FK_PAYMENT_ITEM_PAYMENT_PaymentID",
                        column: x => x.PaymentID,
                        principalTable: "PAYMENT",
                        principalColumn: "PaymentID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PAYMENT_ITEM_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PAYMENT_ITEM_enrollments_EnrollmentID",
                        column: x => x.EnrollmentID,
                        principalTable: "enrollments",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_UserId",
                table: "PAYMENT",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_ITEM_CourseID",
                table: "PAYMENT_ITEM",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_ITEM_EnrollmentID",
                table: "PAYMENT_ITEM",
                column: "EnrollmentID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_ITEM_PaymentID_EnrollmentID",
                table: "PAYMENT_ITEM",
                columns: new[] { "PaymentID", "EnrollmentID" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_users_LearnerID",
                table: "PAYMENT",
                column: "LearnerID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_users_UserId",
                table: "PAYMENT",
                column: "UserId",
                principalTable: "users",
                principalColumn: "UserID");

            migrationBuilder.AddForeignKey(
                name: "FK_payment_transactions_PAYMENT_PaymentID",
                table: "payment_transactions",
                column: "PaymentID",
                principalTable: "PAYMENT",
                principalColumn: "PaymentID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_users_LearnerID",
                table: "PAYMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_users_UserId",
                table: "PAYMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_payment_transactions_PAYMENT_PaymentID",
                table: "payment_transactions");

            migrationBuilder.DropTable(
                name: "PAYMENT_ITEM");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PAYMENT",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_UserId",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PAYMENT");

            migrationBuilder.RenameTable(
                name: "PAYMENT",
                newName: "payments");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_MerchantTxnRef",
                table: "payments",
                newName: "IX_payments_MerchantTxnRef");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_LearnerID",
                table: "payments",
                newName: "IX_payments_LearnerID");

            migrationBuilder.AddColumn<int>(
                name: "PaymentID",
                table: "enrollments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CourseID",
                table: "payments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EnrollmentID",
                table: "payments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_payments",
                table: "payments",
                column: "PaymentID");

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_PaymentID",
                table: "enrollments",
                column: "PaymentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_CourseID",
                table: "payments",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_payments_EnrollmentID",
                table: "payments",
                column: "EnrollmentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status",
                table: "payments",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_payment_transactions_payments_PaymentID",
                table: "payment_transactions",
                column: "PaymentID",
                principalTable: "payments",
                principalColumn: "PaymentID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_courses_CourseID",
                table: "payments",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_enrollments_EnrollmentID",
                table: "payments",
                column: "EnrollmentID",
                principalTable: "enrollments",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_users_LearnerID",
                table: "payments",
                column: "LearnerID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
