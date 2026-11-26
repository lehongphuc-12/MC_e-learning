using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "course_reviews",
                columns: table => new
                {
                    ReviewID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    LearnerID = table.Column<int>(type: "integer", nullable: false),
                    CertificateID = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<short>(type: "smallint", nullable: false),
                    Comment = table.Column<string>(type: "text", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false, defaultValue: "PUBLISHED"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_reviews", x => x.ReviewID);
                    table.CheckConstraint("CK_course_reviews_Rating", "\"Rating\" >= 1 AND \"Rating\" <= 5");
                    table.ForeignKey(
                        name: "FK_course_reviews_certificates_CertificateID",
                        column: x => x.CertificateID,
                        principalTable: "certificates",
                        principalColumn: "CertificateID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_reviews_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_reviews_users_LearnerID",
                        column: x => x.LearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_course_reviews_CertificateID",
                table: "course_reviews",
                column: "CertificateID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_course_reviews_CourseID_LearnerID",
                table: "course_reviews",
                columns: new[] { "CourseID", "LearnerID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_course_reviews_CourseID_Status_CreatedAt",
                table: "course_reviews",
                columns: new[] { "CourseID", "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_course_reviews_LearnerID",
                table: "course_reviews",
                column: "LearnerID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "course_reviews");
        }
    }
}
