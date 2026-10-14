using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class ExpandQuizQuestionTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers");

            migrationBuilder.DropIndex(
                name: "IX_quiz_attempts_QuizID",
                table: "quiz_attempts");

            migrationBuilder.DropIndex(
                name: "IX_quiz_answers_AttemptID",
                table: "quiz_answers");

            migrationBuilder.DropIndex(
                name: "IX_questions_QuizID",
                table: "questions");

            migrationBuilder.AddColumn<DateTime>(
                name: "GradedAt",
                table: "quiz_answers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GradedByID",
                table: "quiz_answers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxScore",
                table: "quiz_answers",
                type: "numeric(8,2)",
                nullable: false,
                defaultValue: 1.00m);

            migrationBuilder.AddColumn<decimal>(
                name: "Score",
                table: "quiz_answers",
                type: "numeric(8,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TeacherFeedback",
                table: "quiz_answers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TextAnswer",
                table: "quiz_answers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Instruction",
                table: "questions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRequired",
                table: "questions",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Points",
                table: "questions",
                type: "numeric(8,2)",
                nullable: false,
                defaultValue: 1.00m);

            migrationBuilder.AddColumn<string>(
                name: "Explanation",
                table: "choices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionValue",
                table: "choices",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "question_annotations",
                columns: table => new
                {
                    AnnotationID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    AnnotationType = table.Column<string>(type: "text", nullable: false),
                    StartIndex = table.Column<int>(type: "integer", nullable: false),
                    EndIndex = table.Column<int>(type: "integer", nullable: false),
                    AnnotationValue = table.Column<string>(type: "text", nullable: true),
                    Explanation = table.Column<string>(type: "text", nullable: true),
                    Points = table.Column<decimal>(type: "numeric(8,2)", nullable: false, defaultValue: 1.00m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_annotations", x => x.AnnotationID);
                    table.ForeignKey(
                        name: "FK_question_annotations_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_arrange_items",
                columns: table => new
                {
                    ArrangeItemID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CorrectOrder = table.Column<int>(type: "integer", nullable: true),
                    IsDistractor = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_arrange_items", x => x.ArrangeItemID);
                    table.ForeignKey(
                        name: "FK_question_arrange_items_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_error_regions",
                columns: table => new
                {
                    ErrorRegionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    StartTimeMs = table.Column<int>(type: "integer", nullable: false),
                    EndTimeMs = table.Column<int>(type: "integer", nullable: false),
                    ErrorCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ErrorCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CorrectionText = table.Column<string>(type: "text", nullable: true),
                    Points = table.Column<decimal>(type: "numeric(8,2)", nullable: false, defaultValue: 1.00m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_error_regions", x => x.ErrorRegionID);
                    table.ForeignKey(
                        name: "FK_question_error_regions_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_media",
                columns: table => new
                {
                    MediaID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    MediaType = table.Column<string>(type: "text", nullable: false),
                    MediaUrl = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_media", x => x.MediaID);
                    table.ForeignKey(
                        name: "FK_question_media_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_writing_configs",
                columns: table => new
                {
                    WritingConfigID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    EventType = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Audience = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Style = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    MinWords = table.Column<int>(type: "integer", nullable: true),
                    MaxWords = table.Column<int>(type: "integer", nullable: true),
                    RequiredElementsJson = table.Column<string>(type: "text", nullable: true),
                    GradingRubricJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_writing_configs", x => x.WritingConfigID);
                    table.ForeignKey(
                        name: "FK_question_writing_configs_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_answer_selected_choices",
                columns: table => new
                {
                    QuizAnswerSelectedChoiceID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false),
                    ChoiceID = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_answer_selected_choices", x => x.QuizAnswerSelectedChoiceID);
                    table.ForeignKey(
                        name: "FK_quiz_answer_selected_choices_choices_ChoiceID",
                        column: x => x.ChoiceID,
                        principalTable: "choices",
                        principalColumn: "ChoiceID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_quiz_answer_selected_choices_quiz_answers_QuizAnswerID",
                        column: x => x.QuizAnswerID,
                        principalTable: "quiz_answers",
                        principalColumn: "QuizAnswerID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scenario_nodes",
                columns: table => new
                {
                    NodeID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    NodeType = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    MediaUrl = table.Column<string>(type: "text", nullable: true),
                    IsStartNode = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsEndNode = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Points = table.Column<decimal>(type: "numeric(8,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scenario_nodes", x => x.NodeID);
                    table.ForeignKey(
                        name: "FK_scenario_nodes_questions_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "questions",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_answer_annotations",
                columns: table => new
                {
                    AnswerAnnotationID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false),
                    AnnotationType = table.Column<string>(type: "text", nullable: false),
                    StartIndex = table.Column<int>(type: "integer", nullable: false),
                    EndIndex = table.Column<int>(type: "integer", nullable: false),
                    AnnotationValue = table.Column<string>(type: "text", nullable: true),
                    MatchedAnnotationID = table.Column<int>(type: "integer", nullable: true),
                    Score = table.Column<decimal>(type: "numeric(8,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_answer_annotations", x => x.AnswerAnnotationID);
                    table.ForeignKey(
                        name: "FK_quiz_answer_annotations_question_annotations_MatchedAnnotat~",
                        column: x => x.MatchedAnnotationID,
                        principalTable: "question_annotations",
                        principalColumn: "AnnotationID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quiz_answer_annotations_quiz_answers_QuizAnswerID",
                        column: x => x.QuizAnswerID,
                        principalTable: "quiz_answers",
                        principalColumn: "QuizAnswerID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_answer_arrange_items",
                columns: table => new
                {
                    AnswerArrangeItemID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false),
                    ArrangeItemID = table.Column<int>(type: "integer", nullable: false),
                    SelectedOrder = table.Column<int>(type: "integer", nullable: true),
                    IsIncluded = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_answer_arrange_items", x => x.AnswerArrangeItemID);
                    table.ForeignKey(
                        name: "FK_quiz_answer_arrange_items_question_arrange_items_ArrangeIte~",
                        column: x => x.ArrangeItemID,
                        principalTable: "question_arrange_items",
                        principalColumn: "ArrangeItemID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_quiz_answer_arrange_items_quiz_answers_QuizAnswerID",
                        column: x => x.QuizAnswerID,
                        principalTable: "quiz_answers",
                        principalColumn: "QuizAnswerID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_answer_error_regions",
                columns: table => new
                {
                    AnswerErrorRegionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false),
                    SelectedStartTimeMs = table.Column<int>(type: "integer", nullable: false),
                    SelectedEndTimeMs = table.Column<int>(type: "integer", nullable: true),
                    SelectedErrorCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SelectedErrorCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MatchedErrorRegionID = table.Column<int>(type: "integer", nullable: true),
                    LocationScore = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    TypeScore = table.Column<decimal>(type: "numeric(8,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_answer_error_regions", x => x.AnswerErrorRegionID);
                    table.ForeignKey(
                        name: "FK_quiz_answer_error_regions_question_error_regions_MatchedErr~",
                        column: x => x.MatchedErrorRegionID,
                        principalTable: "question_error_regions",
                        principalColumn: "ErrorRegionID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quiz_answer_error_regions_quiz_answers_QuizAnswerID",
                        column: x => x.QuizAnswerID,
                        principalTable: "quiz_answers",
                        principalColumn: "QuizAnswerID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scenario_choices",
                columns: table => new
                {
                    ScenarioChoiceID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NodeID = table.Column<int>(type: "integer", nullable: false),
                    ChoiceText = table.Column<string>(type: "text", nullable: false),
                    NextNodeID = table.Column<int>(type: "integer", nullable: true),
                    Score = table.Column<decimal>(type: "numeric(8,2)", nullable: false, defaultValue: 0m),
                    Feedback = table.Column<string>(type: "text", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scenario_choices", x => x.ScenarioChoiceID);
                    table.ForeignKey(
                        name: "FK_scenario_choices_scenario_nodes_NextNodeID",
                        column: x => x.NextNodeID,
                        principalTable: "scenario_nodes",
                        principalColumn: "NodeID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_scenario_choices_scenario_nodes_NodeID",
                        column: x => x.NodeID,
                        principalTable: "scenario_nodes",
                        principalColumn: "NodeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_answer_scenario_paths",
                columns: table => new
                {
                    AnswerScenarioPathID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false),
                    NodeID = table.Column<int>(type: "integer", nullable: false),
                    ScenarioChoiceID = table.Column<int>(type: "integer", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_answer_scenario_paths", x => x.AnswerScenarioPathID);
                    table.ForeignKey(
                        name: "FK_quiz_answer_scenario_paths_quiz_answers_QuizAnswerID",
                        column: x => x.QuizAnswerID,
                        principalTable: "quiz_answers",
                        principalColumn: "QuizAnswerID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quiz_answer_scenario_paths_scenario_choices_ScenarioChoiceID",
                        column: x => x.ScenarioChoiceID,
                        principalTable: "scenario_choices",
                        principalColumn: "ScenarioChoiceID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_quiz_answer_scenario_paths_scenario_nodes_NodeID",
                        column: x => x.NodeID,
                        principalTable: "scenario_nodes",
                        principalColumn: "NodeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quiz_attempts_QuizID_UserID",
                table: "quiz_attempts",
                columns: new[] { "QuizID", "UserID" });

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answers_AttemptID_QuestionID",
                table: "quiz_answers",
                columns: new[] { "AttemptID", "QuestionID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answers_GradedByID",
                table: "quiz_answers",
                column: "GradedByID");

            migrationBuilder.CreateIndex(
                name: "IX_questions_QuizID_OrderIndex",
                table: "questions",
                columns: new[] { "QuizID", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_question_annotations_QuestionID",
                table: "question_annotations",
                column: "QuestionID");

            migrationBuilder.CreateIndex(
                name: "IX_question_arrange_items_QuestionID",
                table: "question_arrange_items",
                column: "QuestionID");

            migrationBuilder.CreateIndex(
                name: "IX_question_error_regions_QuestionID",
                table: "question_error_regions",
                column: "QuestionID");

            migrationBuilder.CreateIndex(
                name: "IX_question_media_QuestionID_OrderIndex",
                table: "question_media",
                columns: new[] { "QuestionID", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_question_writing_configs_QuestionID",
                table: "question_writing_configs",
                column: "QuestionID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_annotations_MatchedAnnotationID",
                table: "quiz_answer_annotations",
                column: "MatchedAnnotationID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_annotations_QuizAnswerID",
                table: "quiz_answer_annotations",
                column: "QuizAnswerID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_arrange_items_ArrangeItemID",
                table: "quiz_answer_arrange_items",
                column: "ArrangeItemID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_arrange_items_QuizAnswerID_ArrangeItemID",
                table: "quiz_answer_arrange_items",
                columns: new[] { "QuizAnswerID", "ArrangeItemID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_error_regions_MatchedErrorRegionID",
                table: "quiz_answer_error_regions",
                column: "MatchedErrorRegionID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_error_regions_QuizAnswerID",
                table: "quiz_answer_error_regions",
                column: "QuizAnswerID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_scenario_paths_NodeID",
                table: "quiz_answer_scenario_paths",
                column: "NodeID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_scenario_paths_QuizAnswerID_StepOrder",
                table: "quiz_answer_scenario_paths",
                columns: new[] { "QuizAnswerID", "StepOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_scenario_paths_ScenarioChoiceID",
                table: "quiz_answer_scenario_paths",
                column: "ScenarioChoiceID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_selected_choices_ChoiceID",
                table: "quiz_answer_selected_choices",
                column: "ChoiceID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answer_selected_choices_QuizAnswerID_ChoiceID",
                table: "quiz_answer_selected_choices",
                columns: new[] { "QuizAnswerID", "ChoiceID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scenario_choices_NextNodeID",
                table: "scenario_choices",
                column: "NextNodeID");

            migrationBuilder.CreateIndex(
                name: "IX_scenario_choices_NodeID",
                table: "scenario_choices",
                column: "NodeID");

            migrationBuilder.CreateIndex(
                name: "IX_scenario_nodes_QuestionID",
                table: "scenario_nodes",
                column: "QuestionID");

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers",
                column: "QuestionID",
                principalTable: "questions",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_users_GradedByID",
                table: "quiz_answers",
                column: "GradedByID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_users_GradedByID",
                table: "quiz_answers");

            migrationBuilder.DropTable(
                name: "question_media");

            migrationBuilder.DropTable(
                name: "question_writing_configs");

            migrationBuilder.DropTable(
                name: "quiz_answer_annotations");

            migrationBuilder.DropTable(
                name: "quiz_answer_arrange_items");

            migrationBuilder.DropTable(
                name: "quiz_answer_error_regions");

            migrationBuilder.DropTable(
                name: "quiz_answer_scenario_paths");

            migrationBuilder.DropTable(
                name: "quiz_answer_selected_choices");

            migrationBuilder.DropTable(
                name: "question_annotations");

            migrationBuilder.DropTable(
                name: "question_arrange_items");

            migrationBuilder.DropTable(
                name: "question_error_regions");

            migrationBuilder.DropTable(
                name: "scenario_choices");

            migrationBuilder.DropTable(
                name: "scenario_nodes");

            migrationBuilder.DropIndex(
                name: "IX_quiz_attempts_QuizID_UserID",
                table: "quiz_attempts");

            migrationBuilder.DropIndex(
                name: "IX_quiz_answers_AttemptID_QuestionID",
                table: "quiz_answers");

            migrationBuilder.DropIndex(
                name: "IX_quiz_answers_GradedByID",
                table: "quiz_answers");

            migrationBuilder.DropIndex(
                name: "IX_questions_QuizID_OrderIndex",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "GradedAt",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "GradedByID",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "MaxScore",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "Score",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "TeacherFeedback",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "TextAnswer",
                table: "quiz_answers");

            migrationBuilder.DropColumn(
                name: "Instruction",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "IsRequired",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "Points",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "Explanation",
                table: "choices");

            migrationBuilder.DropColumn(
                name: "OptionValue",
                table: "choices");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_attempts_QuizID",
                table: "quiz_attempts",
                column: "QuizID");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_answers_AttemptID",
                table: "quiz_answers",
                column: "AttemptID");

            migrationBuilder.CreateIndex(
                name: "IX_questions_QuizID",
                table: "questions",
                column: "QuizID");

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers",
                column: "QuestionID",
                principalTable: "questions",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
