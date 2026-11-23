using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddPrerequisiteCourseIdToCourse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrerequisiteCourseID",
                table: "courses",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_courses_PrerequisiteCourseID",
                table: "courses",
                column: "PrerequisiteCourseID");

            migrationBuilder.AddForeignKey(
                name: "FK_courses_courses_PrerequisiteCourseID",
                table: "courses",
                column: "PrerequisiteCourseID",
                principalTable: "courses",
                principalColumn: "CourseID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_courses_courses_PrerequisiteCourseID",
                table: "courses");

            migrationBuilder.DropIndex(
                name: "IX_courses_PrerequisiteCourseID",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "PrerequisiteCourseID",
                table: "courses");
        }
    }
}
