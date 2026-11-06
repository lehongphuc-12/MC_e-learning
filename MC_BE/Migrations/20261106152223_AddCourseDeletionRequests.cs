using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseDeletionRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "course_deletion_requests",
                columns: table => new
                {
                    RequestID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    CourseTitle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    InstructorID = table.Column<int>(type: "integer", nullable: false),
                    InstructorName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ReviewedByID = table.Column<int>(type: "integer", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdminNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_deletion_requests", x => x.RequestID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_course_deletion_requests_CourseID",
                table: "course_deletion_requests",
                column: "CourseID",
                unique: true,
                filter: "\"Status\" = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "IX_course_deletion_requests_Status_RequestedAt",
                table: "course_deletion_requests",
                columns: new[] { "Status", "RequestedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "course_deletion_requests");
        }
    }
}
