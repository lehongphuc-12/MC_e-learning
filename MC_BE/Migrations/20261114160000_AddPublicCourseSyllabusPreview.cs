using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicCourseSyllabusPreview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreviewAssessmentOverview",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewLearningOutcomes",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewPrerequisites",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewTargetAudience",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewAssessmentOverview",
                table: "course_syllabus_versions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewDescription",
                table: "course_syllabus_versions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewLearningOutcomes",
                table: "course_syllabus_versions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewPrerequisites",
                table: "course_syllabus_versions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewTargetAudience",
                table: "course_syllabus_versions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreviewAssessmentOverview",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "PreviewLearningOutcomes",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "PreviewPrerequisites",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "PreviewTargetAudience",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "PreviewAssessmentOverview",
                table: "course_syllabus_versions");

            migrationBuilder.DropColumn(
                name: "PreviewDescription",
                table: "course_syllabus_versions");

            migrationBuilder.DropColumn(
                name: "PreviewLearningOutcomes",
                table: "course_syllabus_versions");

            migrationBuilder.DropColumn(
                name: "PreviewPrerequisites",
                table: "course_syllabus_versions");

            migrationBuilder.DropColumn(
                name: "PreviewTargetAudience",
                table: "course_syllabus_versions");
        }
    }
}
