using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddLearningProgressAndCertificate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ENROLLMENT_USER_UserID",
                table: "ENROLLMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_USER_UserID",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_ENROLLMENT_UserID_CourseID",
                table: "ENROLLMENT");

            migrationBuilder.DropColumn(
                name: "GatewayName",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "TransactionAmount",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "PaymentDate",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "PAYMENT");

            migrationBuilder.RenameColumn(
                name: "GatewayTransactionCode",
                table: "PAYMENT_TRANSACTION",
                newName: "ProviderTransactionNo");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "PAYMENT",
                newName: "LearnerID");

            migrationBuilder.RenameColumn(
                name: "TransactionRef",
                table: "PAYMENT",
                newName: "VnPayTransactionNo");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_UserID",
                table: "PAYMENT",
                newName: "IX_PAYMENT_LearnerID");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "ENROLLMENT",
                newName: "LearnerID");

            migrationBuilder.RenameColumn(
                name: "ProgressPercent",
                table: "ENROLLMENT",
                newName: "CompletionPercentage");

            migrationBuilder.RenameColumn(
                name: "EnrollmentDate",
                table: "ENROLLMENT",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "CompletedAt",
                table: "ENROLLMENT",
                newName: "ExpiresAt");

            migrationBuilder.AlterColumn<string>(
                name: "TransactionStatus",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "BankCode",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "PAYMENT_TRANSACTION",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "PAYMENT_TRANSACTION",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "VNPAY");

            migrationBuilder.AddColumn<bool>(
                name: "SignatureValid",
                table: "PAYMENT_TRANSACTION",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "PAYMENT",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "VNPAY",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "PAYMENT",
                type: "numeric(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)");

            migrationBuilder.AddColumn<int>(
                name: "CourseID",
                table: "PAYMENT",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "PAYMENT",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "VND");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "PAYMENT",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "MerchantTxnRef",
                table: "PAYMENT",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OrderInfo",
                table: "PAYMENT",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "PAYMENT",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PAYMENT",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "VnPayResponseCode",
                table: "PAYMENT",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VnPayTransactionStatus",
                table: "PAYMENT",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCompleted",
                table: "LESSON_PROGRESS",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "LastPositionSeconds",
                table: "LESSON_PROGRESS",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TimeSpentSeconds",
                table: "LESSON_PROGRESS",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "LESSON_PROGRESS",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ENROLLMENT",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDING_PAYMENT",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "ACTIVE");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "ENROLLMENT",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTime>(
                name: "EnrolledAt",
                table: "ENROLLMENT",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentID",
                table: "ENROLLMENT",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CERTIFICATE",
                columns: table => new
                {
                    CertificateID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EnrollmentID = table.Column<int>(type: "integer", nullable: false),
                    CertificateCode = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CompletionPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 100.00m),
                    Grade = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "ACTIVE"),
                    CertificateUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CERTIFICATE", x => x.CertificateID);
                    table.ForeignKey(
                        name: "FK_CERTIFICATE_ENROLLMENT_EnrollmentID",
                        column: x => x.EnrollmentID,
                        principalTable: "ENROLLMENT",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_TRANSACTION_ProviderTransactionNo",
                table: "PAYMENT_TRANSACTION",
                column: "ProviderTransactionNo");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_TRANSACTION_Status",
                table: "PAYMENT_TRANSACTION",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_CourseID",
                table: "PAYMENT",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT",
                column: "EnrollmentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_MerchantTxnRef",
                table: "PAYMENT",
                column: "MerchantTxnRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_Status",
                table: "PAYMENT",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_LearnerID_CourseID_Status",
                table: "ENROLLMENT",
                columns: new[] { "LearnerID", "CourseID", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_PaymentID",
                table: "ENROLLMENT",
                column: "PaymentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CERTIFICATE_CertificateCode",
                table: "CERTIFICATE",
                column: "CertificateCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CERTIFICATE_EnrollmentID",
                table: "CERTIFICATE",
                column: "EnrollmentID",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ENROLLMENT_USER_LearnerID",
                table: "ENROLLMENT",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_COURSE_CourseID",
                table: "PAYMENT",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_USER_LearnerID",
                table: "PAYMENT",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ENROLLMENT_USER_LearnerID",
                table: "ENROLLMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_COURSE_CourseID",
                table: "PAYMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_USER_LearnerID",
                table: "PAYMENT");

            migrationBuilder.DropTable(
                name: "CERTIFICATE");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_TRANSACTION_ProviderTransactionNo",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_TRANSACTION_Status",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_CourseID",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_MerchantTxnRef",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_Status",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_ENROLLMENT_LearnerID_CourseID_Status",
                table: "ENROLLMENT");

            migrationBuilder.DropIndex(
                name: "IX_ENROLLMENT_PaymentID",
                table: "ENROLLMENT");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "SignatureValid",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "CourseID",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "MerchantTxnRef",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "OrderInfo",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "VnPayResponseCode",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "VnPayTransactionStatus",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "IsCompleted",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropColumn(
                name: "LastPositionSeconds",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropColumn(
                name: "TimeSpentSeconds",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "ENROLLMENT");

            migrationBuilder.DropColumn(
                name: "EnrolledAt",
                table: "ENROLLMENT");

            migrationBuilder.DropColumn(
                name: "PaymentID",
                table: "ENROLLMENT");

            migrationBuilder.RenameColumn(
                name: "ProviderTransactionNo",
                table: "PAYMENT_TRANSACTION",
                newName: "GatewayTransactionCode");

            migrationBuilder.RenameColumn(
                name: "VnPayTransactionNo",
                table: "PAYMENT",
                newName: "TransactionRef");

            migrationBuilder.RenameColumn(
                name: "LearnerID",
                table: "PAYMENT",
                newName: "UserID");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_LearnerID",
                table: "PAYMENT",
                newName: "IX_PAYMENT_UserID");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "ENROLLMENT",
                newName: "EnrollmentDate");

            migrationBuilder.RenameColumn(
                name: "LearnerID",
                table: "ENROLLMENT",
                newName: "UserID");

            migrationBuilder.RenameColumn(
                name: "ExpiresAt",
                table: "ENROLLMENT",
                newName: "CompletedAt");

            migrationBuilder.RenameColumn(
                name: "CompletionPercentage",
                table: "ENROLLMENT",
                newName: "ProgressPercent");

            migrationBuilder.AlterColumn<string>(
                name: "TransactionStatus",
                table: "PAYMENT_TRANSACTION",
                type: "text",
                nullable: false,
                defaultValue: "PENDING",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BankCode",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GatewayName",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TransactionAmount",
                table: "PAYMENT_TRANSACTION",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "PAYMENT",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "VNPAY");

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "PAYMENT",
                type: "numeric(10,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)");

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDate",
                table: "PAYMENT",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "PAYMENT",
                type: "text",
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ENROLLMENT",
                type: "text",
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "PENDING_PAYMENT");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT",
                column: "EnrollmentID");

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_UserID_CourseID",
                table: "ENROLLMENT",
                columns: new[] { "UserID", "CourseID" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ENROLLMENT_USER_UserID",
                table: "ENROLLMENT",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_USER_UserID",
                table: "PAYMENT",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
