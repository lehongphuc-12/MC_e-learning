using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingScriptScopeAndHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE IF EXISTS speaking_scripts DROP CONSTRAINT IF EXISTS ""FK_speaking_scripts_lessons_LessonID"";
                ALTER TABLE IF EXISTS speaking_scripts DROP CONSTRAINT IF EXISTS fk_speaking_scripts_lesson;
                DROP INDEX IF EXISTS ""IX_speaking_scripts_LessonID"";
                DROP INDEX IF EXISTS speaking_scripts_lessonid_key;
            ");

            migrationBuilder.AlterColumn<int>(
                name: "LessonID",
                table: "speaking_submissions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "ScriptID",
                table: "speaking_submissions",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LessonID",
                table: "speaking_scripts",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "CourseID",
                table: "speaking_scripts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ModuleID",
                table: "speaking_scripts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PassingScore",
                table: "speaking_scripts",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 80.00m);

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "speaking_scripts",
                type: "text",
                nullable: false,
                defaultValue: "FINAL");

            migrationBuilder.Sql(@"
                UPDATE speaking_scripts s 
                SET ""CourseID"" = l.""CourseID"" 
                FROM lessons l 
                WHERE s.""LessonID"" = l.""LessonID"";

                UPDATE speaking_scripts 
                SET ""CourseID"" = (SELECT ""CourseID"" FROM courses ORDER BY ""CourseID"" LIMIT 1) 
                WHERE ""CourseID"" = 0 OR ""CourseID"" NOT IN (SELECT ""CourseID"" FROM courses);

                UPDATE speaking_submissions sub 
                SET ""ScriptID"" = s.""ScriptID"" 
                FROM speaking_scripts s 
                WHERE sub.""LessonID"" = s.""LessonID"" AND sub.""ScriptID"" IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_LearnerID_ScriptID",
                table: "speaking_submissions",
                columns: new[] { "LearnerID", "ScriptID" });

            migrationBuilder.CreateIndex(
                name: "IX_speaking_submissions_ScriptID",
                table: "speaking_submissions",
                column: "ScriptID");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_CourseID",
                table: "speaking_scripts",
                column: "CourseID");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                unique: true,
                filter: "\"LessonID\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_ModuleID",
                table: "speaking_scripts",
                column: "ModuleID");

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_scripts_courses_CourseID",
                table: "speaking_scripts",
                column: "CourseID",
                principalTable: "courses",
                principalColumn: "CourseID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_scripts_lessons_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_scripts_modules_ModuleID",
                table: "speaking_scripts",
                column: "ModuleID",
                principalTable: "modules",
                principalColumn: "ModuleID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_submissions_speaking_scripts_ScriptID",
                table: "speaking_submissions",
                column: "ScriptID",
                principalTable: "speaking_scripts",
                principalColumn: "ScriptID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_speaking_scripts_courses_CourseID",
                table: "speaking_scripts");

            migrationBuilder.DropForeignKey(
                name: "FK_speaking_scripts_lessons_LessonID",
                table: "speaking_scripts");

            migrationBuilder.DropForeignKey(
                name: "FK_speaking_scripts_modules_ModuleID",
                table: "speaking_scripts");

            migrationBuilder.DropForeignKey(
                name: "FK_speaking_submissions_speaking_scripts_ScriptID",
                table: "speaking_submissions");

            migrationBuilder.DropIndex(
                name: "IX_speaking_submissions_LearnerID_ScriptID",
                table: "speaking_submissions");

            migrationBuilder.DropIndex(
                name: "IX_speaking_submissions_ScriptID",
                table: "speaking_submissions");

            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_CourseID",
                table: "speaking_scripts");

            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts");

            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_ModuleID",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "ScriptID",
                table: "speaking_submissions");

            migrationBuilder.DropColumn(
                name: "CourseID",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "ModuleID",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "PassingScore",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "speaking_scripts");

            migrationBuilder.AlterColumn<int>(
                name: "LessonID",
                table: "speaking_submissions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LessonID",
                table: "speaking_scripts",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_scripts_lessons_LessonID",
                table: "speaking_scripts",
                column: "LessonID",
                principalTable: "lessons",
                principalColumn: "LessonID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
