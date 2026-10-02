using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingSubmissionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "speaking_submissions",
                columns: table => new
                {
                    SubmissionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LessonID = table.Column<int>(type: "integer", nullable: false),
                    LearnerID = table.Column<int>(type: "integer", nullable: false),
                    AudioUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "SUBMITTED"),
                    Score = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    Feedback = table.Column<string>(type: "text", nullable: true),
                    GradedByID = table.Column<int>(type: "integer", nullable: true),
                    GradedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_speaking_submissions", x => x.SubmissionID);
                    table.ForeignKey(
                        name: "FK_speaking_submissions_lessons_LessonID",
                        column: x => x.LessonID,
                        principalTable: "lessons",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_speaking_submissions_users_GradedByID",
                        column: x => x.GradedByID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_speaking_submissions_users_LearnerID",
                        column: x => x.LearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_GradedByID",
                table: "speaking_submissions",
                column: "GradedByID");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_LearnerID_LessonID",
                table: "speaking_submissions",
                columns: new[] { "LearnerID", "LessonID" });

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_LessonID",
                table: "speaking_submissions",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_Status",
                table: "speaking_submissions",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "speaking_submissions");
        }
    }
}
