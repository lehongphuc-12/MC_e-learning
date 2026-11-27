using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddLearnerFavoriteCourses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "learner_favorite_courses",
                columns: table => new
                {
                    LearnerID = table.Column<int>(type: "integer", nullable: false),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_learner_favorite_courses", x => new { x.LearnerID, x.CourseID });
                    table.ForeignKey(
                        name: "FK_learner_favorite_courses_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_learner_favorite_courses_users_LearnerID",
                        column: x => x.LearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_learner_favorite_courses_CourseID",
                table: "learner_favorite_courses",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_learner_favorite_courses_LearnerID_CreatedAt",
                table: "learner_favorite_courses",
                columns: new[] { "LearnerID", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "learner_favorite_courses");
        }
    }
}
