using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class SyncTableMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CHOICE_QUESTION_QuestionID",
                table: "CHOICE");

            migrationBuilder.DropForeignKey(
                name: "FK_COURSE_CATEGORY_CategoryID",
                table: "COURSE");

            migrationBuilder.DropForeignKey(
                name: "FK_COURSE_USER_InstructorID",
                table: "COURSE");

            migrationBuilder.DropForeignKey(
                name: "FK_COURSE_MATERIAL_COURSE_CourseID",
                table: "COURSE_MATERIAL");

            migrationBuilder.DropForeignKey(
                name: "FK_COURSE_MATERIAL_LESSON_LessonID",
                table: "COURSE_MATERIAL");

            migrationBuilder.DropForeignKey(
                name: "FK_COURSE_MATERIAL_USER_UploaderID",
                table: "COURSE_MATERIAL");

            migrationBuilder.DropForeignKey(
                name: "FK_ENROLLMENT_COURSE_CourseID",
                table: "ENROLLMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_ENROLLMENT_USER_UserID",
                table: "ENROLLMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_LESSON_COURSE_CourseID",
                table: "LESSON");

            migrationBuilder.DropForeignKey(
                name: "FK_LESSON_MODULE_ModuleID",
                table: "LESSON");

            migrationBuilder.DropForeignKey(
                name: "FK_LESSON_PROGRESS_ENROLLMENT_EnrollmentID",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropForeignKey(
                name: "FK_LESSON_PROGRESS_LESSON_LessonID",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropForeignKey(
                name: "FK_MODULE_COURSE_CourseID",
                table: "MODULE");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_ENROLLMENT_EnrollmentID",
                table: "PAYMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_USER_UserID",
                table: "PAYMENT");

            migrationBuilder.DropForeignKey(
                name: "FK_PAYMENT_TRANSACTION_PAYMENT_PaymentID",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropForeignKey(
                name: "FK_QUESTION_QUIZ_QuizID",
                table: "QUESTION");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_COURSE_CourseID",
                table: "QUIZ");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_LESSON_LessonID",
                table: "QUIZ");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_USER_CreatedByID",
                table: "QUIZ");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_ANSWER_CHOICE_SelectedChoiceID",
                table: "QUIZ_ANSWER");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_ANSWER_QUESTION_QuestionID",
                table: "QUIZ_ANSWER");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_ANSWER_QUIZ_ATTEMPT_AttemptID",
                table: "QUIZ_ANSWER");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_ATTEMPT_QUIZ_QuizID",
                table: "QUIZ_ATTEMPT");

            migrationBuilder.DropForeignKey(
                name: "FK_QUIZ_ATTEMPT_USER_UserID",
                table: "QUIZ_ATTEMPT");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QUIZ_ATTEMPT",
                table: "QUIZ_ATTEMPT");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QUIZ_ANSWER",
                table: "QUIZ_ANSWER");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QUIZ",
                table: "QUIZ");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QUESTION",
                table: "QUESTION");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PAYMENT_TRANSACTION",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PAYMENT",
                table: "PAYMENT");

            migrationBuilder.DropIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MODULE",
                table: "MODULE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LESSON_PROGRESS",
                table: "LESSON_PROGRESS");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LESSON",
                table: "LESSON");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ENROLLMENT",
                table: "ENROLLMENT");

            migrationBuilder.DropIndex(
                name: "IX_ENROLLMENT_UserID_CourseID",
                table: "ENROLLMENT");

            migrationBuilder.DropPrimaryKey(
                name: "PK_COURSE_MATERIAL",
                table: "COURSE_MATERIAL");

            migrationBuilder.DropPrimaryKey(
                name: "PK_COURSE",
                table: "COURSE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CHOICE",
                table: "CHOICE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CATEGORY",
                table: "CATEGORY");

            migrationBuilder.DropColumn(
                name: "GatewayName",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "TransactionAmount",
                table: "PAYMENT_TRANSACTION");

            migrationBuilder.DropColumn(
                name: "PaymentDate",
                table: "PAYMENT");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "PAYMENT");

            migrationBuilder.RenameTable(
                name: "QUIZ_ATTEMPT",
                newName: "quiz_attempts");

            migrationBuilder.RenameTable(
                name: "QUIZ_ANSWER",
                newName: "quiz_answers");

            migrationBuilder.RenameTable(
                name: "QUIZ",
                newName: "quizzes");

            migrationBuilder.RenameTable(
                name: "QUESTION",
                newName: "questions");

            migrationBuilder.RenameTable(
                name: "PAYMENT_TRANSACTION",
                newName: "payment_transactions");

            migrationBuilder.RenameTable(
                name: "PAYMENT",
                newName: "payments");

            migrationBuilder.RenameTable(
                name: "MODULE",
                newName: "modules");

            migrationBuilder.RenameTable(
                name: "LESSON_PROGRESS",
                newName: "lesson_progresses");

            migrationBuilder.RenameTable(
                name: "LESSON",
                newName: "lessons");

            migrationBuilder.RenameTable(
                name: "ENROLLMENT",
                newName: "enrollments");

            migrationBuilder.RenameTable(
                name: "COURSE_MATERIAL",
                newName: "course_materials");

            migrationBuilder.RenameTable(
                name: "COURSE",
                newName: "courses");

            migrationBuilder.RenameTable(
                name: "CHOICE",
                newName: "choices");

            migrationBuilder.RenameTable(
                name: "CATEGORY",
                newName: "categories");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_ATTEMPT_UserID",
                table: "quiz_attempts",
                newName: "IX_quiz_attempts_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_ATTEMPT_QuizID",
                table: "quiz_attempts",
                newName: "IX_quiz_attempts_QuizID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_ANSWER_SelectedChoiceID",
                table: "quiz_answers",
                newName: "IX_quiz_answers_SelectedChoiceID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_ANSWER_QuestionID",
                table: "quiz_answers",
                newName: "IX_quiz_answers_QuestionID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_ANSWER_AttemptID",
                table: "quiz_answers",
                newName: "IX_quiz_answers_AttemptID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_LessonID",
                table: "quizzes",
                newName: "IX_quizzes_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_CreatedByID",
                table: "quizzes",
                newName: "IX_quizzes_CreatedByID");

            migrationBuilder.RenameIndex(
                name: "IX_QUIZ_CourseID",
                table: "quizzes",
                newName: "IX_quizzes_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_QUESTION_QuizID",
                table: "questions",
                newName: "IX_questions_QuizID");

            migrationBuilder.RenameColumn(
                name: "GatewayTransactionCode",
                table: "payment_transactions",
                newName: "ProviderTransactionNo");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_TRANSACTION_PaymentID",
                table: "payment_transactions",
                newName: "IX_payment_transactions_PaymentID");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "payments",
                newName: "LearnerID");

            migrationBuilder.RenameColumn(
                name: "TransactionRef",
                table: "payments",
                newName: "VnPayTransactionNo");

            migrationBuilder.RenameIndex(
                name: "IX_PAYMENT_UserID",
                table: "payments",
                newName: "IX_payments_LearnerID");

            migrationBuilder.RenameIndex(
                name: "IX_MODULE_CourseID",
                table: "modules",
                newName: "IX_modules_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_LESSON_PROGRESS_LessonID",
                table: "lesson_progresses",
                newName: "IX_lesson_progresses_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_LESSON_PROGRESS_EnrollmentID_LessonID",
                table: "lesson_progresses",
                newName: "IX_lesson_progresses_EnrollmentID_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_LESSON_ModuleID",
                table: "lessons",
                newName: "IX_lessons_ModuleID");

            migrationBuilder.RenameIndex(
                name: "IX_LESSON_CourseID",
                table: "lessons",
                newName: "IX_lessons_CourseID");

            migrationBuilder.RenameColumn(
                name: "UserID",
                table: "enrollments",
                newName: "LearnerID");

            migrationBuilder.RenameColumn(
                name: "ProgressPercent",
                table: "enrollments",
                newName: "CompletionPercentage");

            migrationBuilder.RenameColumn(
                name: "EnrollmentDate",
                table: "enrollments",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "CompletedAt",
                table: "enrollments",
                newName: "ExpiresAt");

            migrationBuilder.RenameIndex(
                name: "IX_ENROLLMENT_CourseID",
                table: "enrollments",
                newName: "IX_enrollments_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_MATERIAL_UploaderID",
                table: "course_materials",
                newName: "IX_course_materials_UploaderID");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_MATERIAL_LessonID",
                table: "course_materials",
                newName: "IX_course_materials_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_MATERIAL_CourseID",
                table: "course_materials",
                newName: "IX_course_materials_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_Slug",
                table: "courses",
                newName: "IX_courses_Slug");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_InstructorID",
                table: "courses",
                newName: "IX_courses_InstructorID");

            migrationBuilder.RenameIndex(
                name: "IX_COURSE_CategoryID",
                table: "courses",
                newName: "IX_courses_CategoryID");

            migrationBuilder.RenameIndex(
                name: "IX_CHOICE_QuestionID",
                table: "choices",
                newName: "IX_choices_QuestionID");

            migrationBuilder.AlterColumn<string>(
                name: "TransactionStatus",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "BankCode",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "payment_transactions",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "payment_transactions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "VNPAY");

            migrationBuilder.AddColumn<bool>(
                name: "SignatureValid",
                table: "payment_transactions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "VNPAY",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "payments",
                type: "numeric(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)");

            migrationBuilder.AddColumn<int>(
                name: "CourseID",
                table: "payments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "payments",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "VND");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "MerchantTxnRef",
                table: "payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OrderInfo",
                table: "payments",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "VnPayResponseCode",
                table: "payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VnPayTransactionStatus",
                table: "payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "enrollments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDING_PAYMENT",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "ACTIVE");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "enrollments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTime>(
                name: "EnrolledAt",
                table: "enrollments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentID",
                table: "enrollments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_quiz_attempts",
                table: "quiz_attempts",
                column: "AttemptID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_quiz_answers",
                table: "quiz_answers",
                column: "QuizAnswerID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_quizzes",
                table: "quizzes",
                column: "QuizID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_questions",
                table: "questions",
                column: "QuestionID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_payment_transactions",
                table: "payment_transactions",
                column: "TransactionID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_payments",
                table: "payments",
                column: "PaymentID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_modules",
                table: "modules",
                column: "ModuleID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_lesson_progresses",
                table: "lesson_progresses",
                column: "LessonProgressID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_lessons",
                table: "lessons",
                column: "LessonID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_enrollments",
                table: "enrollments",
                column: "EnrollmentID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_course_materials",
                table: "course_materials",
                column: "MaterialID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_courses",
                table: "courses",
                column: "CourseID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_choices",
                table: "choices",
                column: "ChoiceID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_categories",
                table: "categories",
                column: "CategoryID");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions",
                column: "ProviderTransactionNo");

            migrationBuilder.CreateIndex(
                name: "IX_payment_transactions_Status",
                table: "payment_transactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CourseID",
                table: "payments",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_payments_EnrollmentID",
                table: "payments",
                column: "EnrollmentID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_MerchantTxnRef",
                table: "payments",
                column: "MerchantTxnRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status",
                table: "payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_LearnerID_CourseID_Status",
                table: "enrollments",
                columns: new[] { "LearnerID", "CourseID", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_PaymentID",
                table: "enrollments",
                column: "PaymentID",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_choices_questions_QuestionID",
                table: "choices",
                column: "QuestionID",
                principalTable: "questions",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_course_materials_USER_UploaderID",
                table: "course_materials",
                column: "UploaderID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_course_materials_courses_CourseID",
                table: "course_materials",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_course_materials_lessons_LessonID",
                table: "course_materials",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_courses_USER_InstructorID",
                table: "courses",
                column: "InstructorID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_courses_categories_CategoryID",
                table: "courses",
                column: "CategoryID",
                principalTable: "categories",
                principalColumn: "CategoryID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_enrollments_USER_LearnerID",
                table: "enrollments",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_enrollments_courses_CourseID",
                table: "enrollments",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lesson_progresses_enrollments_EnrollmentID",
                table: "lesson_progresses",
                column: "EnrollmentID",
                principalTable: "enrollments",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lesson_progresses_lessons_LessonID",
                table: "lesson_progresses",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessons_courses_CourseID",
                table: "lessons",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_lessons_modules_ModuleID",
                table: "lessons",
                column: "ModuleID",
                principalTable: "modules",
                principalColumn: "ModuleID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_modules_courses_CourseID",
                table: "modules",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_payment_transactions_payments_PaymentID",
                table: "payment_transactions",
                column: "PaymentID",
                principalTable: "payments",
                principalColumn: "PaymentID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_USER_LearnerID",
                table: "payments",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_courses_CourseID",
                table: "payments",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_enrollments_EnrollmentID",
                table: "payments",
                column: "EnrollmentID",
                principalTable: "enrollments",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_questions_quizzes_QuizID",
                table: "questions",
                column: "QuizID",
                principalTable: "quizzes",
                principalColumn: "QuizID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_choices_SelectedChoiceID",
                table: "quiz_answers",
                column: "SelectedChoiceID",
                principalTable: "choices",
                principalColumn: "ChoiceID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers",
                column: "QuestionID",
                principalTable: "questions",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_answers_quiz_attempts_AttemptID",
                table: "quiz_answers",
                column: "AttemptID",
                principalTable: "quiz_attempts",
                principalColumn: "AttemptID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_attempts_USER_UserID",
                table: "quiz_attempts",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_attempts_quizzes_QuizID",
                table: "quiz_attempts",
                column: "QuizID",
                principalTable: "quizzes",
                principalColumn: "QuizID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quizzes_USER_CreatedByID",
                table: "quizzes",
                column: "CreatedByID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_quizzes_courses_CourseID",
                table: "quizzes",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quizzes_lessons_LessonID",
                table: "quizzes",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_choices_questions_QuestionID",
                table: "choices");

            migrationBuilder.DropForeignKey(
                name: "FK_course_materials_USER_UploaderID",
                table: "course_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_course_materials_courses_CourseID",
                table: "course_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_course_materials_lessons_LessonID",
                table: "course_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_USER_InstructorID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_categories_CategoryID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_enrollments_USER_LearnerID",
                table: "enrollments");

            migrationBuilder.DropForeignKey(
                name: "FK_enrollments_courses_CourseID",
                table: "enrollments");

            migrationBuilder.DropForeignKey(
                name: "FK_lesson_progresses_enrollments_EnrollmentID",
                table: "lesson_progresses");

            migrationBuilder.DropForeignKey(
                name: "FK_lesson_progresses_lessons_LessonID",
                table: "lesson_progresses");

            migrationBuilder.DropForeignKey(
                name: "FK_lessons_courses_CourseID",
                table: "lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_lessons_modules_ModuleID",
                table: "lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_modules_courses_CourseID",
                table: "modules");

            migrationBuilder.DropForeignKey(
                name: "FK_payment_transactions_payments_PaymentID",
                table: "payment_transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_USER_LearnerID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_courses_CourseID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_enrollments_EnrollmentID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_questions_quizzes_QuizID",
                table: "questions");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_choices_SelectedChoiceID",
                table: "quiz_answers");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_questions_QuestionID",
                table: "quiz_answers");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_answers_quiz_attempts_AttemptID",
                table: "quiz_answers");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_attempts_USER_UserID",
                table: "quiz_attempts");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_attempts_quizzes_QuizID",
                table: "quiz_attempts");

            migrationBuilder.DropForeignKey(
                name: "FK_quizzes_USER_CreatedByID",
                table: "quizzes");

            migrationBuilder.DropForeignKey(
                name: "FK_quizzes_courses_CourseID",
                table: "quizzes");

            migrationBuilder.DropForeignKey(
                name: "FK_quizzes_lessons_LessonID",
                table: "quizzes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_quizzes",
                table: "quizzes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_quiz_attempts",
                table: "quiz_attempts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_quiz_answers",
                table: "quiz_answers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_questions",
                table: "questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_payments",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_CourseID",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_EnrollmentID",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_MerchantTxnRef",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_Status",
                table: "payments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_payment_transactions",
                table: "payment_transactions");

            migrationBuilder.DropIndex(
                name: "IX_payment_transactions_ProviderTransactionNo",
                table: "payment_transactions");

            migrationBuilder.DropIndex(
                name: "IX_payment_transactions_Status",
                table: "payment_transactions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_modules",
                table: "modules");

            migrationBuilder.DropPrimaryKey(
                name: "PK_lessons",
                table: "lessons");

            migrationBuilder.DropPrimaryKey(
                name: "PK_lesson_progresses",
                table: "lesson_progresses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_enrollments",
                table: "enrollments");

            migrationBuilder.DropIndex(
                name: "IX_enrollments_LearnerID_CourseID_Status",
                table: "enrollments");

            migrationBuilder.DropIndex(
                name: "IX_enrollments_PaymentID",
                table: "enrollments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_courses",
                table: "courses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_course_materials",
                table: "course_materials");

            migrationBuilder.DropPrimaryKey(
                name: "PK_choices",
                table: "choices");

            migrationBuilder.DropPrimaryKey(
                name: "PK_categories",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "CourseID",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "MerchantTxnRef",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "OrderInfo",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "VnPayResponseCode",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "VnPayTransactionStatus",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "SignatureValid",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "payment_transactions");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "enrollments");

            migrationBuilder.DropColumn(
                name: "EnrolledAt",
                table: "enrollments");

            migrationBuilder.DropColumn(
                name: "PaymentID",
                table: "enrollments");

            migrationBuilder.RenameTable(
                name: "quizzes",
                newName: "QUIZ");

            migrationBuilder.RenameTable(
                name: "quiz_attempts",
                newName: "QUIZ_ATTEMPT");

            migrationBuilder.RenameTable(
                name: "quiz_answers",
                newName: "QUIZ_ANSWER");

            migrationBuilder.RenameTable(
                name: "questions",
                newName: "QUESTION");

            migrationBuilder.RenameTable(
                name: "payments",
                newName: "PAYMENT");

            migrationBuilder.RenameTable(
                name: "payment_transactions",
                newName: "PAYMENT_TRANSACTION");

            migrationBuilder.RenameTable(
                name: "modules",
                newName: "MODULE");

            migrationBuilder.RenameTable(
                name: "lessons",
                newName: "LESSON");

            migrationBuilder.RenameTable(
                name: "lesson_progresses",
                newName: "LESSON_PROGRESS");

            migrationBuilder.RenameTable(
                name: "enrollments",
                newName: "ENROLLMENT");

            migrationBuilder.RenameTable(
                name: "courses",
                newName: "COURSE");

            migrationBuilder.RenameTable(
                name: "course_materials",
                newName: "COURSE_MATERIAL");

            migrationBuilder.RenameTable(
                name: "choices",
                newName: "CHOICE");

            migrationBuilder.RenameTable(
                name: "categories",
                newName: "CATEGORY");

            migrationBuilder.RenameIndex(
                name: "IX_quizzes_LessonID",
                table: "QUIZ",
                newName: "IX_QUIZ_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_quizzes_CreatedByID",
                table: "QUIZ",
                newName: "IX_QUIZ_CreatedByID");

            migrationBuilder.RenameIndex(
                name: "IX_quizzes_CourseID",
                table: "QUIZ",
                newName: "IX_QUIZ_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_quiz_attempts_UserID",
                table: "QUIZ_ATTEMPT",
                newName: "IX_QUIZ_ATTEMPT_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_quiz_attempts_QuizID",
                table: "QUIZ_ATTEMPT",
                newName: "IX_QUIZ_ATTEMPT_QuizID");

            migrationBuilder.RenameIndex(
                name: "IX_quiz_answers_SelectedChoiceID",
                table: "QUIZ_ANSWER",
                newName: "IX_QUIZ_ANSWER_SelectedChoiceID");

            migrationBuilder.RenameIndex(
                name: "IX_quiz_answers_QuestionID",
                table: "QUIZ_ANSWER",
                newName: "IX_QUIZ_ANSWER_QuestionID");

            migrationBuilder.RenameIndex(
                name: "IX_quiz_answers_AttemptID",
                table: "QUIZ_ANSWER",
                newName: "IX_QUIZ_ANSWER_AttemptID");

            migrationBuilder.RenameIndex(
                name: "IX_questions_QuizID",
                table: "QUESTION",
                newName: "IX_QUESTION_QuizID");

            migrationBuilder.RenameColumn(
                name: "VnPayTransactionNo",
                table: "PAYMENT",
                newName: "TransactionRef");

            migrationBuilder.RenameColumn(
                name: "LearnerID",
                table: "PAYMENT",
                newName: "UserID");

            migrationBuilder.RenameIndex(
                name: "IX_payments_LearnerID",
                table: "PAYMENT",
                newName: "IX_PAYMENT_UserID");

            migrationBuilder.RenameColumn(
                name: "ProviderTransactionNo",
                table: "PAYMENT_TRANSACTION",
                newName: "GatewayTransactionCode");

            migrationBuilder.RenameIndex(
                name: "IX_payment_transactions_PaymentID",
                table: "PAYMENT_TRANSACTION",
                newName: "IX_PAYMENT_TRANSACTION_PaymentID");

            migrationBuilder.RenameIndex(
                name: "IX_modules_CourseID",
                table: "MODULE",
                newName: "IX_MODULE_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_lessons_ModuleID",
                table: "LESSON",
                newName: "IX_LESSON_ModuleID");

            migrationBuilder.RenameIndex(
                name: "IX_lessons_CourseID",
                table: "LESSON",
                newName: "IX_LESSON_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_lesson_progresses_LessonID",
                table: "LESSON_PROGRESS",
                newName: "IX_LESSON_PROGRESS_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_lesson_progresses_EnrollmentID_LessonID",
                table: "LESSON_PROGRESS",
                newName: "IX_LESSON_PROGRESS_EnrollmentID_LessonID");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "ENROLLMENT",
                newName: "EnrollmentDate");

            migrationBuilder.RenameColumn(
                name: "LearnerID",
                table: "ENROLLMENT",
                newName: "UserID");

            migrationBuilder.RenameColumn(
                name: "ExpiresAt",
                table: "ENROLLMENT",
                newName: "CompletedAt");

            migrationBuilder.RenameColumn(
                name: "CompletionPercentage",
                table: "ENROLLMENT",
                newName: "ProgressPercent");

            migrationBuilder.RenameIndex(
                name: "IX_enrollments_CourseID",
                table: "ENROLLMENT",
                newName: "IX_ENROLLMENT_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_courses_Slug",
                table: "COURSE",
                newName: "IX_COURSE_Slug");

            migrationBuilder.RenameIndex(
                name: "IX_courses_InstructorID",
                table: "COURSE",
                newName: "IX_COURSE_InstructorID");

            migrationBuilder.RenameIndex(
                name: "IX_courses_CategoryID",
                table: "COURSE",
                newName: "IX_COURSE_CategoryID");

            migrationBuilder.RenameIndex(
                name: "IX_course_materials_UploaderID",
                table: "COURSE_MATERIAL",
                newName: "IX_COURSE_MATERIAL_UploaderID");

            migrationBuilder.RenameIndex(
                name: "IX_course_materials_LessonID",
                table: "COURSE_MATERIAL",
                newName: "IX_COURSE_MATERIAL_LessonID");

            migrationBuilder.RenameIndex(
                name: "IX_course_materials_CourseID",
                table: "COURSE_MATERIAL",
                newName: "IX_COURSE_MATERIAL_CourseID");

            migrationBuilder.RenameIndex(
                name: "IX_choices_QuestionID",
                table: "CHOICE",
                newName: "IX_CHOICE_QuestionID");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "PAYMENT",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "VNPAY");

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "PAYMENT",
                type: "numeric(10,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)");

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDate",
                table: "PAYMENT",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "PAYMENT",
                type: "text",
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AlterColumn<string>(
                name: "TransactionStatus",
                table: "PAYMENT_TRANSACTION",
                type: "text",
                nullable: false,
                defaultValue: "PENDING",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BankCode",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GatewayName",
                table: "PAYMENT_TRANSACTION",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TransactionAmount",
                table: "PAYMENT_TRANSACTION",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ENROLLMENT",
                type: "text",
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "PENDING_PAYMENT");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QUIZ",
                table: "QUIZ",
                column: "QuizID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QUIZ_ATTEMPT",
                table: "QUIZ_ATTEMPT",
                column: "AttemptID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QUIZ_ANSWER",
                table: "QUIZ_ANSWER",
                column: "QuizAnswerID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QUESTION",
                table: "QUESTION",
                column: "QuestionID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PAYMENT",
                table: "PAYMENT",
                column: "PaymentID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PAYMENT_TRANSACTION",
                table: "PAYMENT_TRANSACTION",
                column: "TransactionID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MODULE",
                table: "MODULE",
                column: "ModuleID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LESSON",
                table: "LESSON",
                column: "LessonID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LESSON_PROGRESS",
                table: "LESSON_PROGRESS",
                column: "LessonProgressID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ENROLLMENT",
                table: "ENROLLMENT",
                column: "EnrollmentID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_COURSE",
                table: "COURSE",
                column: "CourseID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_COURSE_MATERIAL",
                table: "COURSE_MATERIAL",
                column: "MaterialID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CHOICE",
                table: "CHOICE",
                column: "ChoiceID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CATEGORY",
                table: "CATEGORY",
                column: "CategoryID");

            migrationBuilder.CreateIndex(
                name: "IX_PAYMENT_EnrollmentID",
                table: "PAYMENT",
                column: "EnrollmentID");

            migrationBuilder.CreateIndex(
                name: "IX_ENROLLMENT_UserID_CourseID",
                table: "ENROLLMENT",
                columns: new[] { "UserID", "CourseID" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CHOICE_QUESTION_QuestionID",
                table: "CHOICE",
                column: "QuestionID",
                principalTable: "QUESTION",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_COURSE_CATEGORY_CategoryID",
                table: "COURSE",
                column: "CategoryID",
                principalTable: "CATEGORY",
                principalColumn: "CategoryID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_COURSE_USER_InstructorID",
                table: "COURSE",
                column: "InstructorID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_COURSE_MATERIAL_COURSE_CourseID",
                table: "COURSE_MATERIAL",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_COURSE_MATERIAL_LESSON_LessonID",
                table: "COURSE_MATERIAL",
                column: "LessonID",
                principalTable: "LESSON",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_COURSE_MATERIAL_USER_UploaderID",
                table: "COURSE_MATERIAL",
                column: "UploaderID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ENROLLMENT_COURSE_CourseID",
                table: "ENROLLMENT",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ENROLLMENT_USER_UserID",
                table: "ENROLLMENT",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LESSON_COURSE_CourseID",
                table: "LESSON",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LESSON_MODULE_ModuleID",
                table: "LESSON",
                column: "ModuleID",
                principalTable: "MODULE",
                principalColumn: "ModuleID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_LESSON_PROGRESS_ENROLLMENT_EnrollmentID",
                table: "LESSON_PROGRESS",
                column: "EnrollmentID",
                principalTable: "ENROLLMENT",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LESSON_PROGRESS_LESSON_LessonID",
                table: "LESSON_PROGRESS",
                column: "LessonID",
                principalTable: "LESSON",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MODULE_COURSE_CourseID",
                table: "MODULE",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_ENROLLMENT_EnrollmentID",
                table: "PAYMENT",
                column: "EnrollmentID",
                principalTable: "ENROLLMENT",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_USER_UserID",
                table: "PAYMENT",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PAYMENT_TRANSACTION_PAYMENT_PaymentID",
                table: "PAYMENT_TRANSACTION",
                column: "PaymentID",
                principalTable: "PAYMENT",
                principalColumn: "PaymentID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUESTION_QUIZ_QuizID",
                table: "QUESTION",
                column: "QuizID",
                principalTable: "QUIZ",
                principalColumn: "QuizID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_COURSE_CourseID",
                table: "QUIZ",
                column: "CourseID",
                principalTable: "COURSE",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_LESSON_LessonID",
                table: "QUIZ",
                column: "LessonID",
                principalTable: "LESSON",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_USER_CreatedByID",
                table: "QUIZ",
                column: "CreatedByID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_ANSWER_CHOICE_SelectedChoiceID",
                table: "QUIZ_ANSWER",
                column: "SelectedChoiceID",
                principalTable: "CHOICE",
                principalColumn: "ChoiceID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_ANSWER_QUESTION_QuestionID",
                table: "QUIZ_ANSWER",
                column: "QuestionID",
                principalTable: "QUESTION",
                principalColumn: "QuestionID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_ANSWER_QUIZ_ATTEMPT_AttemptID",
                table: "QUIZ_ANSWER",
                column: "AttemptID",
                principalTable: "QUIZ_ATTEMPT",
                principalColumn: "AttemptID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_ATTEMPT_QUIZ_QuizID",
                table: "QUIZ_ATTEMPT",
                column: "QuizID",
                principalTable: "QUIZ",
                principalColumn: "QuizID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QUIZ_ATTEMPT_USER_UserID",
                table: "QUIZ_ATTEMPT",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
