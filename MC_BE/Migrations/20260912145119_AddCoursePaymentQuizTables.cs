using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddCoursePaymentQuizTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CATEGORY",
                columns: table => new
                {
                    CategoryID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CategoryName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "ACTIVE")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CATEGORY", x => x.CategoryID);
                });

            migrationBuilder.CreateTable(
                name: "COURSE",
                columns: table => new
                {
                    CourseID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CategoryID = table.Column<int>(type: "integer", nullable: true),
                    InstructorID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Slug = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false, defaultValue: 0.00m),
                    Level = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_COURSE", x => x.CourseID);
                    table.ForeignKey(
                        name: "FK_COURSE_CATEGORY_CategoryID",
                        column: x => x.CategoryID,
                        principalTable: "CATEGORY",
                        principalColumn: "CategoryID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_COURSE_USER_InstructorID",
                        column: x => x.InstructorID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ENROLLMENT",
                columns: table => new
                {
                    EnrollmentID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    EnrollmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "ACTIVE"),
                    ProgressPercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0.00m),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ENROLLMENT", x => x.EnrollmentID);
                    table.ForeignKey(
                        name: "FK_ENROLLMENT_COURSE_CourseID",
                        column: x => x.CourseID,
                        principalTable: "COURSE",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ENROLLMENT_USER_UserID",
                        column: x => x.UserID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LESSON",
                columns: table => new
                {
                    LessonID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    LessonType = table.Column<string>(type: "text", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    IsPreview = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "ACTIVE"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LESSON", x => x.LessonID);
                    table.ForeignKey(
                        name: "FK_LESSON_COURSE_CourseID",
                        column: x => x.CourseID,
                        principalTable: "COURSE",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PAYMENT",
                columns: table => new
                {
                    PaymentID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    EnrollmentID = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    PaymentMethod = table.Column<string>(type: "text", nullable: false),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TransactionRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PAYMENT", x => x.PaymentID);
                    table.ForeignKey(
                        name: "FK_PAYMENT_ENROLLMENT_EnrollmentID",
                        column: x => x.EnrollmentID,
                        principalTable: "ENROLLMENT",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PAYMENT_USER_UserID",
                        column: x => x.UserID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "COURSE_MATERIAL",
                columns: table => new
                {
                    MaterialID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: true),
                    LessonID = table.Column<int>(type: "integer", nullable: true),
                    UploaderID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    MaterialType = table.Column<string>(type: "text", nullable: true),
                    FileUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_COURSE_MATERIAL", x => x.MaterialID);
                    table.ForeignKey(
                        name: "FK_COURSE_MATERIAL_COURSE_CourseID",
                        column: x => x.CourseID,
                        principalTable: "COURSE",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_COURSE_MATERIAL_LESSON_LessonID",
                        column: x => x.LessonID,
                        principalTable: "LESSON",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_COURSE_MATERIAL_USER_UploaderID",
                        column: x => x.UploaderID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LESSON_PROGRESS",
                columns: table => new
                {
                    LessonProgressID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EnrollmentID = table.Column<int>(type: "integer", nullable: false),
                    LessonID = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "NOT_STARTED"),
                    TimeSpentMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LESSON_PROGRESS", x => x.LessonProgressID);
                    table.ForeignKey(
                        name: "FK_LESSON_PROGRESS_ENROLLMENT_EnrollmentID",
                        column: x => x.EnrollmentID,
                        principalTable: "ENROLLMENT",
                        principalColumn: "EnrollmentID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LESSON_PROGRESS_LESSON_LessonID",
                        column: x => x.LessonID,
                        principalTable: "LESSON",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QUIZ",
                columns: table => new
                {
                    QuizID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: true),
                    LessonID = table.Column<int>(type: "integer", nullable: true),
                    CreatedByID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TimeLimitMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    PassingScore = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 80.00m),
                    MaxAttempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "ACTIVE"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QUIZ", x => x.QuizID);
                    table.ForeignKey(
                        name: "FK_QUIZ_COURSE_CourseID",
                        column: x => x.CourseID,
                        principalTable: "COURSE",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QUIZ_LESSON_LessonID",
                        column: x => x.LessonID,
                        principalTable: "LESSON",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_QUIZ_USER_CreatedByID",
                        column: x => x.CreatedByID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PAYMENT_TRANSACTION",
                columns: table => new
                {
                    TransactionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PaymentID = table.Column<int>(type: "integer", nullable: false),
                    GatewayName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    GatewayTransactionCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ResponseCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BankCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TransactionAmount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    TransactionStatus = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PAYMENT_TRANSACTION", x => x.TransactionID);
                    table.ForeignKey(
                        name: "FK_PAYMENT_TRANSACTION_PAYMENT_PaymentID",
                        column: x => x.PaymentID,
                        principalTable: "PAYMENT",
                        principalColumn: "PaymentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QUESTION",
                columns: table => new
                {
                    QuestionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizID = table.Column<int>(type: "integer", nullable: false),
                    QuestionText = table.Column<string>(type: "text", nullable: false),
                    QuestionType = table.Column<string>(type: "text", nullable: false),
                    Explanation = table.Column<string>(type: "text", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QUESTION", x => x.QuestionID);
                    table.ForeignKey(
                        name: "FK_QUESTION_QUIZ_QuizID",
                        column: x => x.QuizID,
                        principalTable: "QUIZ",
                        principalColumn: "QuizID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QUIZ_ATTEMPT",
                columns: table => new
                {
                    AttemptID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizID = table.Column<int>(type: "integer", nullable: false),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    AttemptNumber = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Score = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    ResultStatus = table.Column<string>(type: "text", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QUIZ_ATTEMPT", x => x.AttemptID);
                    table.ForeignKey(
                        name: "FK_QUIZ_ATTEMPT_QUIZ_QuizID",
                        column: x => x.QuizID,
                        principalTable: "QUIZ",
                        principalColumn: "QuizID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QUIZ_ATTEMPT_USER_UserID",
                        column: x => x.UserID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CHOICE",
                columns: table => new
                {
                    ChoiceID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    ChoiceText = table.Column<string>(type: "text", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CHOICE", x => x.ChoiceID);
                    table.ForeignKey(
                        name: "FK_CHOICE_QUESTION_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "QUESTION",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QUIZ_ANSWER",
                columns: table => new
                {
                    QuizAnswerID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AttemptID = table.Column<int>(type: "integer", nullable: false),
                    QuestionID = table.Column<int>(type: "integer", nullable: false),
                    SelectedChoiceID = table.Column<int>(type: "integer", nullable: true),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: true),
                    AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QUIZ_ANSWER", x => x.QuizAnswerID);
                    table.ForeignKey(
                        name: "FK_QUIZ_ANSWER_CHOICE_SelectedChoiceID",
                        column: x => x.SelectedChoiceID,
                        principalTable: "CHOICE",
                        principalColumn: "ChoiceID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_QUIZ_ANSWER_QUESTION_QuestionID",
                        column: x => x.QuestionID,
                        principalTable: "QUESTION",
                        principalColumn: "QuestionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QUIZ_ANSWER_QUIZ_ATTEMPT_AttemptID",
                        column: x => x.AttemptID,
                        principalTable: "QUIZ_ATTEMPT",
                        principalColumn: "AttemptID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CHOICE_QuestionID",
                table: "CHOICE",
                column: "QuestionID");

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_CategoryID",
                table: "COURSE",
                column: "CategoryID");

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_InstructorID",
                table: "COURSE",
                column: "InstructorID");

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_Slug",
                table: "COURSE",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_MATERIAL_CourseID",
                table: "COURSE_MATERIAL",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_MATERIAL_LessonID",
                table: "COURSE_MATERIAL",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_COURSE_MATERIAL_UploaderID",
                table: "COURSE_MATERIAL",
                column: "UploaderID");

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_CourseID",
                table: "ENROLLMENT",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_UserID_CourseID",
                table: "ENROLLMENT",
                columns: new[] { "UserID", "CourseID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LESSON_CourseID",
                table: "LESSON",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_LESSON_PROGRESS_EnrollmentID_LessonID",
                table: "LESSON_PROGRESS",
                columns: new[] { "EnrollmentID", "LessonID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LESSON_PROGRESS_LessonID",
                table: "LESSON_PROGRESS",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT",
                column: "EnrollmentID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_UserID",
                table: "PAYMENT",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_TRANSACTION_PaymentID",
                table: "PAYMENT_TRANSACTION",
                column: "PaymentID");

            migrationBuilder.CreateIndex(
                name: "IX_QUESTION_QuizID",
                table: "QUESTION",
                column: "QuizID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_CourseID",
                table: "QUIZ",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_CreatedByID",
                table: "QUIZ",
                column: "CreatedByID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_LessonID",
                table: "QUIZ",
                column: "LessonID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_ANSWER_AttemptID",
                table: "QUIZ_ANSWER",
                column: "AttemptID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_ANSWER_QuestionID",
                table: "QUIZ_ANSWER",
                column: "QuestionID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_ANSWER_SelectedChoiceID",
                table: "QUIZ_ANSWER",
                column: "SelectedChoiceID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_ATTEMPT_QuizID",
                table: "QUIZ_ATTEMPT",
                column: "QuizID");

            migrationBuilder.CreateIndex(
                name: "IX_QUIZ_ATTEMPT_UserID",
                table: "QUIZ_ATTEMPT",
                column: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "COURSE_MATERIAL");

            migrationBuilder.DropTable(
                name: "LESSON_PROGRESS");

            migrationBuilder.DropTable(
                name: "PAYMENT_TRANSACTION");

            migrationBuilder.DropTable(
                name: "QUIZ_ANSWER");

            migrationBuilder.DropTable(
                name: "PAYMENT");

            migrationBuilder.DropTable(
                name: "CHOICE");

            migrationBuilder.DropTable(
                name: "QUIZ_ATTEMPT");

            migrationBuilder.DropTable(
                name: "ENROLLMENT");

            migrationBuilder.DropTable(
                name: "QUESTION");

            migrationBuilder.DropTable(
                name: "QUIZ");

            migrationBuilder.DropTable(
                name: "LESSON");

            migrationBuilder.DropTable(
                name: "COURSE");

            migrationBuilder.DropTable(
                name: "CATEGORY");
        }
    }
}
