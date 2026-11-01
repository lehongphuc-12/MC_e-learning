using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddLessonTranscriptionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubtitleUrl",
                table: "lessons",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Transcript",
                table: "lessons",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TranscriptStatus",
                table: "lessons",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubtitleUrl",
                table: "lessons");

            migrationBuilder.DropColumn(
                name: "Transcript",
                table: "lessons");

            migrationBuilder.DropColumn(
                name: "TranscriptStatus",
                table: "lessons");
        }
    }
}
