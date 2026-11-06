using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddR2ObjectDeletionJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "r2_object_deletion_jobs",
                columns: table => new
                {
                    JobID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceCourseID = table.Column<int>(type: "integer", nullable: false),
                    ObjectKey = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    NextAttemptAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ProcessingAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_r2_object_deletion_jobs", x => x.JobID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_r2_object_deletion_jobs_SourceCourseID_ObjectKey",
                table: "r2_object_deletion_jobs",
                columns: new[] { "SourceCourseID", "ObjectKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_r2_object_deletion_jobs_Status_NextAttemptAt",
                table: "r2_object_deletion_jobs",
                columns: new[] { "Status", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "r2_object_deletion_jobs");
        }
    }
}
