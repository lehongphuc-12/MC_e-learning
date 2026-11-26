using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddEnrollmentAccessExtensionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "enrollment_access_extension_requests",
                columns: table => new
                {
                    RequestId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EnrollmentId = table.Column<int>(type: "integer", nullable: false),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    CourseId = table.Column<int>(type: "integer", nullable: false),
                    CourseAccessGrantId = table.Column<long>(type: "bigint", nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByAdminId = table.Column<int>(type: "integer", nullable: true),
                    GrantedDays = table.Column<int>(type: "integer", nullable: true),
                    DecisionNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enrollment_access_extension_requests", x => x.RequestId);
                    table.ForeignKey(
                        name: "FK_enrollment_access_extension_requests_course_access_grants_C~",
                        column: x => x.CourseAccessGrantId,
                        principalTable: "course_access_grants",
                        principalColumn: "GrantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollment_access_extension_requests_courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollment_access_extension_requests_enrollments_Enrollment~",
                        column: x => x.EnrollmentId,
                        principalTable: "enrollments",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollment_access_extension_requests_users_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollment_access_extension_requests_users_ReviewedByAdminId",
                        column: x => x.ReviewedByAdminId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_CourseAccessGrantId",
                table: "enrollment_access_extension_requests",
                column: "CourseAccessGrantId");

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_CourseId",
                table: "enrollment_access_extension_requests",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_EnrollmentId_Status",
                table: "enrollment_access_extension_requests",
                columns: new[] { "EnrollmentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_EnrollmentId",
                table: "enrollment_access_extension_requests",
                column: "EnrollmentId",
                unique: true,
                filter: "\"Status\" = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_LearnerId",
                table: "enrollment_access_extension_requests",
                column: "LearnerId");

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_ReviewedByAdminId",
                table: "enrollment_access_extension_requests",
                column: "ReviewedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_enrollment_access_extension_requests_Status_RequestedAt",
                table: "enrollment_access_extension_requests",
                columns: new[] { "Status", "RequestedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "enrollment_access_extension_requests");
        }
    }
}
