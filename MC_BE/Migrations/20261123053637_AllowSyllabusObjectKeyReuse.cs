using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AllowSyllabusObjectKeyReuse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_course_syllabus_versions_ObjectKey",
                table: "course_syllabus_versions");

            migrationBuilder.CreateIndex(
                name: "IX_course_syllabus_versions_ObjectKey",
                table: "course_syllabus_versions",
                column: "ObjectKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_course_syllabus_versions_ObjectKey",
                table: "course_syllabus_versions");

            migrationBuilder.CreateIndex(
                name: "IX_course_syllabus_versions_ObjectKey",
                table: "course_syllabus_versions",
                column: "ObjectKey",
                unique: true);
        }
    }
}
