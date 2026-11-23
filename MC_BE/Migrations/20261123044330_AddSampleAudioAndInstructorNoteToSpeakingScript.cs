using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSampleAudioAndInstructorNoteToSpeakingScript : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InstructorNote",
                table: "speaking_scripts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SampleAudioUrl",
                table: "speaking_scripts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InstructorNote",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "SampleAudioUrl",
                table: "speaking_scripts");
        }
    }
}
