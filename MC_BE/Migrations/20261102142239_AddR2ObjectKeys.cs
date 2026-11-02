using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddR2ObjectKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some environments may already have these columns from a manual schema
            // update while their EF migration history is still behind.
            migrationBuilder.Sql("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS \"SubtitleObjectKey\" text;");
            migrationBuilder.Sql("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS \"ObjectKey\" text;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
