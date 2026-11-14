using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations;

[DbContext(typeof(SmartMcDbContext))]
[Migration("20261114120000_AddCourseSyllabusVersioning")]
public partial class AddCourseSyllabusVersioning : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "course_syllabus_versions",
            columns: table => new
            {
                SyllabusVersionId = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                CourseID = table.Column<int>(type: "integer", nullable: false),
                VersionNumber = table.Column<int>(type: "integer", nullable: false),
                ObjectKey = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                FileExtension = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                ReviewStatus = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false, defaultValue: "DRAFT"),
                IsCurrent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                UploadedByID = table.Column<int>(type: "integer", nullable: false),
                UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                WasPublishedBeforeSubmission = table.Column<bool>(type: "boolean", nullable: false),
                ReviewedByID = table.Column<int>(type: "integer", nullable: true),
                ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                ReviewNote = table.Column<string>(type: "text", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_course_syllabus_versions", x => x.SyllabusVersionId);
                table.ForeignKey("FK_course_syllabus_versions_courses_CourseID", x => x.CourseID, "courses", "CourseID", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_course_syllabus_versions_users_UploadedByID", x => x.UploadedByID, "users", "UserID", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_course_syllabus_versions_users_ReviewedByID", x => x.ReviewedByID, "users", "UserID", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "course_syllabus_upload_sessions",
            columns: table => new
            {
                SessionID = table.Column<Guid>(type: "uuid", nullable: false),
                CourseID = table.Column<int>(type: "integer", nullable: false),
                InstructorID = table.Column<int>(type: "integer", nullable: false),
                ObjectKey = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                FileExtension = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                ExpectedSize = table.Column<long>(type: "bigint", nullable: false),
                Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                SyllabusVersionID = table.Column<int>(type: "integer", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_course_syllabus_upload_sessions", x => x.SessionID);
                table.ForeignKey("FK_course_syllabus_upload_sessions_courses_CourseID", x => x.CourseID, "courses", "CourseID", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_course_syllabus_upload_sessions_users_InstructorID", x => x.InstructorID, "users", "UserID", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_course_syllabus_upload_sessions_course_syllabus_versions_SyllabusVersionID", x => x.SyllabusVersionID, "course_syllabus_versions", "SyllabusVersionId", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.AddColumn<int>(name: "SubmittedSyllabusVersionID", table: "courses", type: "integer", nullable: true);
        migrationBuilder.AddColumn<int>(name: "ApprovedSyllabusVersionID", table: "courses", type: "integer", nullable: true);

        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_CourseID_VersionNumber", table: "course_syllabus_versions", columns: new[] { "CourseID", "VersionNumber" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_CourseID_IsCurrent", table: "course_syllabus_versions", columns: new[] { "CourseID", "IsCurrent" }, unique: true, filter: "\"IsCurrent\" = TRUE");
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_CourseID_ReviewStatus", table: "course_syllabus_versions", columns: new[] { "CourseID", "ReviewStatus" });
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_ObjectKey", table: "course_syllabus_versions", column: "ObjectKey", unique: true);
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_UploadedByID", table: "course_syllabus_versions", column: "UploadedByID");
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_versions_ReviewedByID", table: "course_syllabus_versions", column: "ReviewedByID");
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_upload_sessions_CourseID_Status_ExpiresAt", table: "course_syllabus_upload_sessions", columns: new[] { "CourseID", "Status", "ExpiresAt" });
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_upload_sessions_ObjectKey", table: "course_syllabus_upload_sessions", column: "ObjectKey", unique: true);
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_upload_sessions_InstructorID", table: "course_syllabus_upload_sessions", column: "InstructorID");
        migrationBuilder.CreateIndex(name: "IX_course_syllabus_upload_sessions_SyllabusVersionID", table: "course_syllabus_upload_sessions", column: "SyllabusVersionID");

        migrationBuilder.AddForeignKey(name: "FK_courses_course_syllabus_versions_SubmittedSyllabusVersionID", table: "courses", column: "SubmittedSyllabusVersionID", principalTable: "course_syllabus_versions", principalColumn: "SyllabusVersionId", onDelete: ReferentialAction.SetNull);
        migrationBuilder.AddForeignKey(name: "FK_courses_course_syllabus_versions_ApprovedSyllabusVersionID", table: "courses", column: "ApprovedSyllabusVersionID", principalTable: "course_syllabus_versions", principalColumn: "SyllabusVersionId", onDelete: ReferentialAction.SetNull);
        migrationBuilder.CreateIndex(name: "IX_courses_SubmittedSyllabusVersionID", table: "courses", column: "SubmittedSyllabusVersionID");
        migrationBuilder.CreateIndex(name: "IX_courses_ApprovedSyllabusVersionID", table: "courses", column: "ApprovedSyllabusVersionID");

        // The app uses the private Supabase database connection, not the anon client. With RLS
        // enabled and no public policies, PostgREST's public/anon roles cannot read these files' metadata.
        migrationBuilder.Sql("ALTER TABLE course_syllabus_versions ENABLE ROW LEVEL SECURITY; ALTER TABLE course_syllabus_upload_sessions ENABLE ROW LEVEL SECURITY;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_courses_course_syllabus_versions_SubmittedSyllabusVersionID", table: "courses");
        migrationBuilder.DropForeignKey(name: "FK_courses_course_syllabus_versions_ApprovedSyllabusVersionID", table: "courses");
        migrationBuilder.DropIndex(name: "IX_courses_SubmittedSyllabusVersionID", table: "courses");
        migrationBuilder.DropIndex(name: "IX_courses_ApprovedSyllabusVersionID", table: "courses");
        migrationBuilder.DropColumn(name: "SubmittedSyllabusVersionID", table: "courses");
        migrationBuilder.DropColumn(name: "ApprovedSyllabusVersionID", table: "courses");
        migrationBuilder.DropTable(name: "course_syllabus_upload_sessions");
        migrationBuilder.DropTable(name: "course_syllabus_versions");
    }
}
