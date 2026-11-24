using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonCommentsSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "PostID",
                table: "forum_comments",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "LessonID",
                table: "forum_comments",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_forum_comments_LessonID",
                table: "forum_comments",
                column: "LessonID");

            migrationBuilder.AddForeignKey(
                name: "FK_forum_comments_lessons_LessonID",
                table: "forum_comments",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_forum_comments_lessons_LessonID",
                table: "forum_comments");

            migrationBuilder.DropIndex(
                name: "IX_forum_comments_LessonID",
                table: "forum_comments");

            migrationBuilder.DropColumn(
                name: "LessonID",
                table: "forum_comments");

            migrationBuilder.AlterColumn<int>(
                name: "PostID",
                table: "forum_comments",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
