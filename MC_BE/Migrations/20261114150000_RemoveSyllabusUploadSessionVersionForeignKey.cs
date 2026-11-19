using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations;

[DbContext(typeof(SmartMcDbContext))]
[Migration("20261114150000_RemoveSyllabusUploadSessionVersionForeignKey")]
public partial class RemoveSyllabusUploadSessionVersionForeignKey : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // The upload session can resolve its immutable revision by its unique ObjectKey.
        // IF EXISTS supports databases where the previous migration was only partially applied
        // or where the optional FK column was not created in the deployed schema.
        migrationBuilder.Sql("""
            ALTER TABLE course_syllabus_upload_sessions
                DROP CONSTRAINT IF EXISTS "FK_course_syllabus_upload_sessions_course_syllabus_versions_SyllabusVersionID";
            DROP INDEX IF EXISTS "IX_course_syllabus_upload_sessions_SyllabusVersionID";
            ALTER TABLE course_syllabus_upload_sessions
                DROP COLUMN IF EXISTS "SyllabusVersionID";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE course_syllabus_upload_sessions
                ADD COLUMN IF NOT EXISTS "SyllabusVersionID" integer NULL;
            CREATE INDEX IF NOT EXISTS "IX_course_syllabus_upload_sessions_SyllabusVersionID"
                ON course_syllabus_upload_sessions ("SyllabusVersionID");
            DO $$
            BEGIN
                IF to_regclass('course_syllabus_versions') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM pg_constraint
                       WHERE conname = 'FK_course_syllabus_upload_sessions_course_syllabus_versions_SyllabusVersionID'
                   ) THEN
                    ALTER TABLE course_syllabus_upload_sessions
                        ADD CONSTRAINT "FK_course_syllabus_upload_sessions_course_syllabus_versions_SyllabusVersionID"
                        FOREIGN KEY ("SyllabusVersionID")
                        REFERENCES course_syllabus_versions ("SyllabusVersionId")
                        ON DELETE SET NULL;
                END IF;
            END $$;
            """);
    }
}
