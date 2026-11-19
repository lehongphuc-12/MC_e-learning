using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddRemedialRetakeExpirationAndRounds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_LessonID",
                table: "remedial_assignments");

            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_QuizID",
                table: "remedial_assignments");

            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_SpeakingScriptID",
                table: "remedial_assignments");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "remedial_retake_grants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("UPDATE remedial_retake_grants SET \"ExpiresAt\" = \"GrantedAt\" + INTERVAL '7 days' WHERE \"ExpiresAt\" IS NULL;");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ExpiresAt",
                table: "remedial_retake_grants",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetQuizID_ExpiresAt_Use~",
                table: "remedial_retake_grants",
                columns: new[] { "LearnerID", "TargetQuizID", "ExpiresAt", "UsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetSpeakingScriptID_Exp~",
                table: "remedial_retake_grants",
                columns: new[] { "LearnerID", "TargetSpeakingScriptID", "ExpiresAt", "UsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_LessonID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "LessonID" },
                filter: "\"LessonID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_QuizID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "QuizID" },
                filter: "\"QuizID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_SpeakingScriptID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "SpeakingScriptID" },
                filter: "\"SpeakingScriptID\" IS NOT NULL AND \"IsActive\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetQuizID_ExpiresAt_Use~",
                table: "remedial_retake_grants");

            migrationBuilder.DropIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetSpeakingScriptID_Exp~",
                table: "remedial_retake_grants");

            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_LessonID",
                table: "remedial_assignments");

            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_QuizID",
                table: "remedial_assignments");

            migrationBuilder.DropIndex(
                name: "IX_remedial_assignments_CourseID_SpeakingScriptID",
                table: "remedial_assignments");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "remedial_retake_grants");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_LessonID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "LessonID" },
                unique: true,
                filter: "\"LessonID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_QuizID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "QuizID" },
                unique: true,
                filter: "\"QuizID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_SpeakingScriptID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "SpeakingScriptID" },
                unique: true,
                filter: "\"SpeakingScriptID\" IS NOT NULL AND \"IsActive\" = TRUE");
        }
    }
}
