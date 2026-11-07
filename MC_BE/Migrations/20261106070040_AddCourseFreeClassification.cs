using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseFreeClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some deployed databases may already contain the column from a manual schema update.
            migrationBuilder.Sql("ALTER TABLE courses ADD COLUMN IF NOT EXISTS \"IsFree\" boolean NOT NULL DEFAULT FALSE;");

            // Preserve existing behavior: zero-priced courses have always been treated as free.
            migrationBuilder.Sql("UPDATE courses SET \"IsFree\" = (\"Price\" <= 0);");

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_courses_FreePriceConsistency'
                          AND conrelid = 'courses'::regclass
                    ) THEN
                        ALTER TABLE courses
                        ADD CONSTRAINT "CK_courses_FreePriceConsistency"
                        CHECK (("IsFree" = TRUE AND "Price" = 0) OR ("IsFree" = FALSE AND "Price" > 0));
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally retained for deployed database safety. Rolling back application code
            // must not erase the classification or constraint from production data.
        }
    }
}
