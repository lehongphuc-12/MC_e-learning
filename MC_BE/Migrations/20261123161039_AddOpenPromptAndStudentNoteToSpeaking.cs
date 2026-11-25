using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddOpenPromptAndStudentNoteToSpeaking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StudentNote",
                table: "speaking_submissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PromptContent",
                table: "speaking_scripts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ScriptType",
                table: "speaking_scripts",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "StructureHints",
                table: "speaking_scripts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetDurationSeconds",
                table: "speaking_scripts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentNote",
                table: "speaking_submissions");

            migrationBuilder.DropColumn(
                name: "PromptContent",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "ScriptType",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "StructureHints",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "TargetDurationSeconds",
                table: "speaking_scripts");
        }
    }
}
