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
                table: "COURSE",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByID",
                table: "COURSE",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "COURSE",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmissionNote",
                table: "COURSE",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "COURSE",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_ApprovedByID",
                table: "COURSE",
                column: "ApprovedByID");

            migrationBuilder.AddForeignKey(
                name: "FK_courses_USER_ApprovedByID",
                table: "COURSE",
                column: "ApprovedByID",
                principalTable: "USER",
                principalColumn: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_courses_USER_ApprovedByID",
                table: "COURSE");

            migrationBuilder.DropIndex(
                name: "IX_COURSE_ApprovedByID",
                table: "COURSE");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "COURSE");

            migrationBuilder.DropColumn(
                name: "ApprovedByID",
                table: "COURSE");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "COURSE");

            migrationBuilder.DropColumn(
                name: "SubmissionNote",
                table: "COURSE");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "COURSE");
        }
    }
}
