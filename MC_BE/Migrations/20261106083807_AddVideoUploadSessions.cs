using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoUploadSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "video_upload_sessions",
                columns: table => new
                {
                    SessionID = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    LessonID = table.Column<int>(type: "integer", nullable: false),
                    InstructorID = table.Column<int>(type: "integer", nullable: false),
                    ObjectKey = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExpectedSize = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_video_upload_sessions", x => x.SessionID);
                    table.ForeignKey(
                        name: "FK_video_upload_sessions_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_video_upload_sessions_lessons_LessonID",
                        column: x => x.LessonID,
                        principalTable: "lessons",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_video_upload_sessions_CourseID",
                table: "video_upload_sessions",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_video_upload_sessions_LessonID",
                table: "video_upload_sessions",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_video_upload_sessions_ObjectKey",
                table: "video_upload_sessions",
                column: "ObjectKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_video_upload_sessions_Status_ExpiresAt",
                table: "video_upload_sessions",
                columns: new[] { "Status", "ExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "video_upload_sessions");
        }
    }
}
