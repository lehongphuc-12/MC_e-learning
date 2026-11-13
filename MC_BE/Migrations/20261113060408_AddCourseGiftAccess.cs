using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseGiftAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "course_access_grants",
                columns: table => new
                {
                    GrantId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    CourseId = table.Column<int>(type: "integer", nullable: false),
                    SourceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SourcePaymentItemId = table.Column<int>(type: "integer", nullable: true),
                    SourceEnrollmentId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ACTIVE"),
                    GrantedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevocationReason = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_access_grants", x => x.GrantId);
                    table.ForeignKey(
                        name: "FK_course_access_grants_PAYMENT_ITEM_SourcePaymentItemId",
                        column: x => x.SourcePaymentItemId,
                        principalTable: "PAYMENT_ITEM",
                        principalColumn: "PaymentItemID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_access_grants_courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_course_access_grants_enrollments_SourceEnrollmentId",
                        column: x => x.SourceEnrollmentId,
                        principalTable: "enrollments",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_access_grants_users_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "course_gift_policies",
                columns: table => new
                {
                    PolicyId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    GiftCourseId = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    UpdatedByAdminId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_gift_policies", x => x.PolicyId);
                    table.ForeignKey(
                        name: "FK_course_gift_policies_courses_GiftCourseId",
                        column: x => x.GiftCourseId,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_gift_policies_users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_course_access_grants_CourseId",
                table: "course_access_grants",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_course_access_grants_LearnerId_CourseId_Status",
                table: "course_access_grants",
                columns: new[] { "LearnerId", "CourseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_course_access_grants_SourceEnrollmentId",
                table: "course_access_grants",
                column: "SourceEnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_course_access_grants_SourcePaymentItemId_CourseId_SourceType",
                table: "course_access_grants",
                columns: new[] { "SourcePaymentItemId", "CourseId", "SourceType" },
                unique: true,
                filter: "\"SourcePaymentItemId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_course_gift_policies_GiftCourseId",
                table: "course_gift_policies",
                column: "GiftCourseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_course_gift_policies_UpdatedByAdminId",
                table: "course_gift_policies",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "course_access_grants");

            migrationBuilder.DropTable(
                name: "course_gift_policies");
        }
    }
}
