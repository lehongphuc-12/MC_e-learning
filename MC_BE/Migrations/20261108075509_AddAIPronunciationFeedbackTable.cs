using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddAIPronunciationFeedbackTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_pronunciation_feedbacks",
                columns: table => new
                {
                    FeedbackId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SubmissionId = table.Column<int>(type: "integer", nullable: false),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    ModelVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CheckpointEpoch = table.Column<int>(type: "integer", nullable: false),
                    LLMProvider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LLMModel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PredictionJson = table.Column<string>(type: "text", nullable: false),
                    FeedbackJson = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    ExpectedText = table.Column<string>(type: "text", nullable: true),
                    TranscriptText = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_pronunciation_feedbacks", x => x.FeedbackId);
                    table.ForeignKey(
                        name: "FK_ai_pronunciation_feedbacks_speaking_submissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "speaking_submissions",
                        principalColumn: "SubmissionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ai_pronunciation_feedbacks_users_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_pronunciation_feedbacks_LearnerId",
                table: "ai_pronunciation_feedbacks",
                column: "LearnerId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_pronunciation_feedbacks_SubmissionId_LearnerId",
                table: "ai_pronunciation_feedbacks",
                columns: new[] { "SubmissionId", "LearnerId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_pronunciation_feedbacks");
        }
    }
}
