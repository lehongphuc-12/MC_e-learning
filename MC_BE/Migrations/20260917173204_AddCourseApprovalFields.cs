using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseApprovalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "courses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByID",
                table: "courses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmissionNote",
                table: "courses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "courses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_courses_ApprovedByID",
                table: "courses",
                column: "ApprovedByID");

            migrationBuilder.AddForeignKey(
                name: "FK_courses_users_ApprovedByID",
                table: "courses",
                column: "ApprovedByID",
                principalTable: "users",
                principalColumn: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_courses_users_ApprovedByID",
                table: "courses");

            migrationBuilder.DropIndex(
                name: "IX_courses_ApprovedByID",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "ApprovedByID",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "SubmissionNote",
                table: "courses");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "courses");
        }
    }
}
