using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelAfterMerge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_practice_sessions",
                columns: table => new
                {
                    PracticeSessionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    CourseId = table.Column<int>(type: "integer", nullable: true),
                    LessonId = table.Column<int>(type: "integer", nullable: true),
                    PracticeMode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AudioUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExpectedText = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_practice_sessions", x => x.PracticeSessionId);
                    table.ForeignKey(
                        name: "FK_ai_practice_sessions_courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ai_practice_sessions_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "lessons",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ai_practice_sessions_users_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ai_practice_feedbacks",
                columns: table => new
                {
                    PracticeFeedbackId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PracticeSessionId = table.Column<int>(type: "integer", nullable: false),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    ModelVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CheckpointEpoch = table.Column<int>(type: "integer", nullable: false),
                    LLMProvider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LLMModel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PredictionJson = table.Column<string>(type: "text", nullable: false),
                    FeedbackJson = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    ExpectedText = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_practice_feedbacks", x => x.PracticeFeedbackId);
                    table.ForeignKey(
                        name: "FK_ai_practice_feedbacks_ai_practice_sessions_PracticeSessionId",
                        column: x => x.PracticeSessionId,
                        principalTable: "ai_practice_sessions",
                        principalColumn: "PracticeSessionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ai_practice_feedbacks_users_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_practice_feedbacks_LearnerId",
                table: "ai_practice_feedbacks",
                column: "LearnerId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_practice_feedbacks_PracticeSessionId",
                table: "ai_practice_feedbacks",
                column: "PracticeSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_practice_sessions_CourseId_LessonId_CreatedAt",
                table: "ai_practice_sessions",
                columns: new[] { "CourseId", "LessonId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_practice_sessions_LearnerId_CreatedAt",
                table: "ai_practice_sessions",
                columns: new[] { "LearnerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_practice_sessions_LessonId",
                table: "ai_practice_sessions",
                column: "LessonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_practice_feedbacks");

            migrationBuilder.DropTable(
                name: "ai_practice_sessions");
        }
    }
}
