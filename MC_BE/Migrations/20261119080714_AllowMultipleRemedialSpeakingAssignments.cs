using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleRemedialSpeakingAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                unique: true,
                filter: "\"LessonID\" IS NOT NULL AND \"IsRemedial\" = FALSE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                unique: true,
                filter: "\"LessonID\" IS NOT NULL");
        }
    }
}
