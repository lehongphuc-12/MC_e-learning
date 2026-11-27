using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseReviewModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "course_reviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "course_reviews",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAt",
                table: "course_reviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModeratedByAdminID",
                table: "course_reviews",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModerationReason",
                table: "course_reviews",
                type: "text",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "course_review_reports",
                columns: table => new
                {
                    ReportID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReviewID = table.Column<int>(type: "integer", nullable: false),
                    ReporterLearnerID = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Details = table.Column<string>(type: "text", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false, defaultValue: "PENDING"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByAdminID = table.Column<int>(type: "integer", nullable: true),
                    ResolutionNote = table.Column<string>(type: "text", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_review_reports", x => x.ReportID);
                    table.CheckConstraint("CK_course_review_reports_Category", "\"Category\" IN ('IRRELEVANT', 'ABUSIVE_LANGUAGE', 'SPAM_OR_FAKE', 'PERSONAL_INFO', 'OTHER')");
                    table.CheckConstraint("CK_course_review_reports_Status", "\"Status\" IN ('PENDING', 'UNDER_REVIEW', 'DISMISSED', 'ACTION_TAKEN')");
                    table.ForeignKey(
                        name: "FK_course_review_reports_course_reviews_ReviewID",
                        column: x => x.ReviewID,
                        principalTable: "course_reviews",
                        principalColumn: "ReviewID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_reports_users_ReporterLearnerID",
                        column: x => x.ReporterLearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_reports_users_ReviewedByAdminID",
                        column: x => x.ReviewedByAdminID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "course_review_restrictions",
                columns: table => new
                {
                    RestrictionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    LearnerID = table.Column<int>(type: "integer", nullable: false),
                    TriggerReviewID = table.Column<int>(type: "integer", nullable: true),
                    CreatedByAdminID = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "text", maxLength: 1000, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LiftedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LiftedByAdminID = table.Column<int>(type: "integer", nullable: true),
                    LiftReason = table.Column<string>(type: "text", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_review_restrictions", x => x.RestrictionID);
                    table.ForeignKey(
                        name: "FK_course_review_restrictions_course_reviews_TriggerReviewID",
                        column: x => x.TriggerReviewID,
                        principalTable: "course_reviews",
                        principalColumn: "ReviewID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_restrictions_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_restrictions_users_CreatedByAdminID",
                        column: x => x.CreatedByAdminID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_restrictions_users_LearnerID",
                        column: x => x.LearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_restrictions_users_LiftedByAdminID",
                        column: x => x.LiftedByAdminID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "course_review_moderation_actions",
                columns: table => new
                {
                    ActionID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    ReviewID = table.Column<int>(type: "integer", nullable: true),
                    ReportID = table.Column<int>(type: "integer", nullable: true),
                    TargetLearnerID = table.Column<int>(type: "integer", nullable: true),
                    AdminID = table.Column<int>(type: "integer", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Reason = table.Column<string>(type: "text", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_review_moderation_actions", x => x.ActionID);
                    table.CheckConstraint("CK_course_review_moderation_actions_ActionType", "\"ActionType\" IN ('REPORT_DISMISSED', 'REPORT_REVIEWING', 'REVIEW_HIDDEN', 'REVIEW_RESTORED', 'REVIEW_REMOVED', 'LEARNER_BLOCKED', 'LEARNER_UNBLOCKED')");
                    table.ForeignKey(
                        name: "FK_course_review_moderation_actions_course_review_reports_Repo~",
                        column: x => x.ReportID,
                        principalTable: "course_review_reports",
                        principalColumn: "ReportID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_moderation_actions_course_reviews_ReviewID",
                        column: x => x.ReviewID,
                        principalTable: "course_reviews",
                        principalColumn: "ReviewID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_moderation_actions_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_moderation_actions_users_AdminID",
                        column: x => x.AdminID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_course_review_moderation_actions_users_TargetLearnerID",
                        column: x => x.TargetLearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_course_reviews_ModeratedByAdminID",
                table: "course_reviews",
                column: "ModeratedByAdminID");

            migrationBuilder.AddCheckConstraint(
                name: "CK_course_reviews_Status",
                table: "course_reviews",
                sql: "\"Status\" IN ('PUBLISHED', 'HIDDEN_BY_ADMIN', 'REMOVED_BY_ADMIN', 'DELETED_BY_AUTHOR')");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_moderation_actions_AdminID",
                table: "course_review_moderation_actions",
                column: "AdminID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_moderation_actions_CourseID_CreatedAt",
                table: "course_review_moderation_actions",
                columns: new[] { "CourseID", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_course_review_moderation_actions_ReportID",
                table: "course_review_moderation_actions",
                column: "ReportID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_moderation_actions_ReviewID",
                table: "course_review_moderation_actions",
                column: "ReviewID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_moderation_actions_TargetLearnerID",
                table: "course_review_moderation_actions",
                column: "TargetLearnerID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_reports_ReporterLearnerID",
                table: "course_review_reports",
                column: "ReporterLearnerID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_reports_ReviewedByAdminID",
                table: "course_review_reports",
                column: "ReviewedByAdminID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_reports_ReviewID_ReporterLearnerID",
                table: "course_review_reports",
                columns: new[] { "ReviewID", "ReporterLearnerID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_course_review_reports_ReviewID_Status",
                table: "course_review_reports",
                columns: new[] { "ReviewID", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_course_review_reports_Status_CreatedAt",
                table: "course_review_reports",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_CourseID_IsActive",
                table: "course_review_restrictions",
                columns: new[] { "CourseID", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_CourseID_LearnerID",
                table: "course_review_restrictions",
                columns: new[] { "CourseID", "LearnerID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_CreatedByAdminID",
                table: "course_review_restrictions",
                column: "CreatedByAdminID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_LearnerID",
                table: "course_review_restrictions",
                column: "LearnerID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_LiftedByAdminID",
                table: "course_review_restrictions",
                column: "LiftedByAdminID");

            migrationBuilder.CreateIndex(
                name: "IX_course_review_restrictions_TriggerReviewID",
                table: "course_review_restrictions",
                column: "TriggerReviewID");

            migrationBuilder.AddForeignKey(
                name: "FK_course_reviews_users_ModeratedByAdminID",
                table: "course_reviews",
                column: "ModeratedByAdminID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_course_reviews_users_ModeratedByAdminID",
                table: "course_reviews");

            migrationBuilder.DropTable(
                name: "course_review_moderation_actions");

            migrationBuilder.DropTable(
                name: "course_review_restrictions");

            migrationBuilder.DropTable(
                name: "course_review_reports");

            migrationBuilder.DropIndex(
                name: "IX_course_reviews_ModeratedByAdminID",
                table: "course_reviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_course_reviews_Status",
                table: "course_reviews");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "course_reviews");

            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "course_reviews");

            migrationBuilder.DropColumn(
                name: "ModeratedAt",
                table: "course_reviews");

            migrationBuilder.DropColumn(
                name: "ModeratedByAdminID",
                table: "course_reviews");

            migrationBuilder.DropColumn(
                name: "ModerationReason",
                table: "course_reviews");
        }
    }
}
