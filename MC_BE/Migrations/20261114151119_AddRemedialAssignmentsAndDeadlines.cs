using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddRemedialAssignmentsAndDeadlines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DueAt",
                table: "speaking_scripts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRemedial",
                table: "speaking_scripts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsRemedial",
                table: "quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsRemedial",
                table: "lessons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "remedial_assignments",
                columns: table => new
                {
                    RemedialAssignmentID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    LessonID = table.Column<int>(type: "integer", nullable: true),
                    QuizID = table.Column<int>(type: "integer", nullable: true),
                    SpeakingScriptID = table.Column<int>(type: "integer", nullable: true),
                    TargetQuizID = table.Column<int>(type: "integer", nullable: true),
                    TargetSpeakingScriptID = table.Column<int>(type: "integer", nullable: true),
                    AssignedByID = table.Column<int>(type: "integer", nullable: false),
                    MaxAttempts = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_remedial_assignments", x => x.RemedialAssignmentID);
                    table.CheckConstraint("CK_remedial_assignments_one_content", "((\"LessonID\" IS NOT NULL)::int + (\"QuizID\" IS NOT NULL)::int + (\"SpeakingScriptID\" IS NOT NULL)::int) = 1");
                    table.ForeignKey(
                        name: "FK_remedial_assignments_courses_CourseID",
                        column: x => x.CourseID,
                        principalTable: "courses",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_lessons_LessonID",
                        column: x => x.LessonID,
                        principalTable: "lessons",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_quizzes_QuizID",
                        column: x => x.QuizID,
                        principalTable: "quizzes",
                        principalColumn: "QuizID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_quizzes_TargetQuizID",
                        column: x => x.TargetQuizID,
                        principalTable: "quizzes",
                        principalColumn: "QuizID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_speaking_scripts_SpeakingScriptID",
                        column: x => x.SpeakingScriptID,
                        principalTable: "speaking_scripts",
                        principalColumn: "ScriptID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_speaking_scripts_TargetSpeakingScriptID",
                        column: x => x.TargetSpeakingScriptID,
                        principalTable: "speaking_scripts",
                        principalColumn: "ScriptID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_remedial_assignments_users_AssignedByID",
                        column: x => x.AssignedByID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "remedial_assignment_events",
                columns: table => new
                {
                    EventID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RemedialAssignmentID = table.Column<int>(type: "integer", nullable: false),
                    StudentID = table.Column<int>(type: "integer", nullable: true),
                    ActorID = table.Column<int>(type: "integer", nullable: false),
                    EventType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_remedial_assignment_events", x => x.EventID);
                    table.ForeignKey(
                        name: "FK_remedial_assignment_events_remedial_assignments_RemedialAss~",
                        column: x => x.RemedialAssignmentID,
                        principalTable: "remedial_assignments",
                        principalColumn: "RemedialAssignmentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "remedial_assignment_recipients",
                columns: table => new
                {
                    RecipientID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RemedialAssignmentID = table.Column<int>(type: "integer", nullable: false),
                    StudentID = table.Column<int>(type: "integer", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    DueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false, defaultValue: "ASSIGNED"),
                    AttemptsUsed = table.Column<int>(type: "integer", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_remedial_assignment_recipients", x => x.RecipientID);
                    table.ForeignKey(
                        name: "FK_remedial_assignment_recipients_remedial_assignments_Remedia~",
                        column: x => x.RemedialAssignmentID,
                        principalTable: "remedial_assignments",
                        principalColumn: "RemedialAssignmentID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_assignment_recipients_users_StudentID",
                        column: x => x.StudentID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "remedial_retake_grants",
                columns: table => new
                {
                    GrantID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RecipientID = table.Column<int>(type: "integer", nullable: false),
                    LearnerID = table.Column<int>(type: "integer", nullable: false),
                    TargetQuizID = table.Column<int>(type: "integer", nullable: true),
                    TargetSpeakingScriptID = table.Column<int>(type: "integer", nullable: true),
                    GrantedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_remedial_retake_grants", x => x.GrantID);
                    table.CheckConstraint("CK_remedial_retake_grants_one_target", "((\"TargetQuizID\" IS NOT NULL)::int + (\"TargetSpeakingScriptID\" IS NOT NULL)::int) = 1");
                    table.ForeignKey(
                        name: "FK_remedial_retake_grants_quizzes_TargetQuizID",
                        column: x => x.TargetQuizID,
                        principalTable: "quizzes",
                        principalColumn: "QuizID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_retake_grants_remedial_assignment_recipients_Recip~",
                        column: x => x.RecipientID,
                        principalTable: "remedial_assignment_recipients",
                        principalColumn: "RecipientID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_retake_grants_speaking_scripts_TargetSpeakingScrip~",
                        column: x => x.TargetSpeakingScriptID,
                        principalTable: "speaking_scripts",
                        principalColumn: "ScriptID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_remedial_retake_grants_users_LearnerID",
                        column: x => x.LearnerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignment_events_RemedialAssignmentID_CreatedAt",
                table: "remedial_assignment_events",
                columns: new[] { "RemedialAssignmentID", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignment_recipients_RemedialAssignmentID_Student~",
                table: "remedial_assignment_recipients",
                columns: new[] { "RemedialAssignmentID", "StudentID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignment_recipients_StudentID_Status_DueAt",
                table: "remedial_assignment_recipients",
                columns: new[] { "StudentID", "Status", "DueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_AssignedByID",
                table: "remedial_assignments",
                column: "AssignedByID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_IsActive_CreatedAt",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "IsActive", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_LessonID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "LessonID" },
                unique: true,
                filter: "\"LessonID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_QuizID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "QuizID" },
                unique: true,
                filter: "\"QuizID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_CourseID_SpeakingScriptID",
                table: "remedial_assignments",
                columns: new[] { "CourseID", "SpeakingScriptID" },
                unique: true,
                filter: "\"SpeakingScriptID\" IS NOT NULL AND \"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_LessonID",
                table: "remedial_assignments",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_QuizID",
                table: "remedial_assignments",
                column: "QuizID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_SpeakingScriptID",
                table: "remedial_assignments",
                column: "SpeakingScriptID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_TargetQuizID",
                table: "remedial_assignments",
                column: "TargetQuizID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_assignments_TargetSpeakingScriptID",
                table: "remedial_assignments",
                column: "TargetSpeakingScriptID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetQuizID_UsedAt",
                table: "remedial_retake_grants",
                columns: new[] { "LearnerID", "TargetQuizID", "UsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_LearnerID_TargetSpeakingScriptID_Use~",
                table: "remedial_retake_grants",
                columns: new[] { "LearnerID", "TargetSpeakingScriptID", "UsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_RecipientID",
                table: "remedial_retake_grants",
                column: "RecipientID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_TargetQuizID",
                table: "remedial_retake_grants",
                column: "TargetQuizID");

            migrationBuilder.CreateIndex(
                name: "IX_remedial_retake_grants_TargetSpeakingScriptID",
                table: "remedial_retake_grants",
                column: "TargetSpeakingScriptID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "remedial_assignment_events");

            migrationBuilder.DropTable(
                name: "remedial_retake_grants");

            migrationBuilder.DropTable(
                name: "remedial_assignment_recipients");

            migrationBuilder.DropTable(
                name: "remedial_assignments");

            migrationBuilder.DropColumn(
                name: "DueAt",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "IsRemedial",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "IsRemedial",
                table: "quizzes");

            migrationBuilder.DropColumn(
                name: "IsRemedial",
                table: "lessons");
        }
    }
}
