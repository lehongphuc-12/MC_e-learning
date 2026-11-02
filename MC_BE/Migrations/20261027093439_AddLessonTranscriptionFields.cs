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
            migrationBuilder.Sql("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS \"SubtitleUrl\" text;");
            migrationBuilder.Sql("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS \"Transcript\" text;");
            migrationBuilder.Sql("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS \"TranscriptStatus\" integer NOT NULL DEFAULT 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
