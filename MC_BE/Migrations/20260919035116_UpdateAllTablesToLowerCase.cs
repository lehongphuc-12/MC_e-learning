using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAllTablesToLowerCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_course_materials_USER_UploaderID",
                table: "course_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_USER_ApprovedByID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_USER_InstructorID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_enrollments_USER_LearnerID",
                table: "enrollments");

            migrationBuilder.DropForeignKey(
                name: "FK_PASSWORD_RESET_TOKEN_USER_UserID",
                table: "PASSWORD_RESET_TOKEN");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_USER_LearnerID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_attempts_USER_UserID",
                table: "quiz_attempts");

            migrationBuilder.DropForeignKey(
                name: "FK_quizzes_USER_CreatedByID",
                table: "quizzes");

            migrationBuilder.DropForeignKey(
                name: "FK_REFRESH_TOKEN_USER_UserID",
                table: "REFRESH_TOKEN");

            migrationBuilder.DropForeignKey(
                name: "FK_USER_ROLE_RoleID",
                table: "USER");

            migrationBuilder.DropForeignKey(
                name: "FK_USER_PROFILE_USER_UserID",
                table: "USER_PROFILE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_USER_PROFILE",
                table: "USER_PROFILE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_USER",
                table: "USER");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ROLE",
                table: "ROLE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_REFRESH_TOKEN",
                table: "REFRESH_TOKEN");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PASSWORD_RESET_TOKEN",
                table: "PASSWORD_RESET_TOKEN");

            migrationBuilder.RenameTable(
                name: "USER_PROFILE",
                newName: "user_profiles");

            migrationBuilder.RenameTable(
                name: "USER",
                newName: "users");

            migrationBuilder.RenameTable(
                name: "ROLE",
                newName: "roles");

            migrationBuilder.RenameTable(
                name: "REFRESH_TOKEN",
                newName: "refresh_tokens");

            migrationBuilder.RenameTable(
                name: "PASSWORD_RESET_TOKEN",
                newName: "password_reset_tokens");

            migrationBuilder.RenameIndex(
                name: "IX_USER_PROFILE_UserID",
                table: "user_profiles",
                newName: "IX_user_profiles_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_USER_RoleID",
                table: "users",
                newName: "IX_users_RoleID");

            migrationBuilder.RenameIndex(
                name: "IX_USER_Email",
                table: "users",
                newName: "IX_users_Email");

            migrationBuilder.RenameIndex(
                name: "IX_ROLE_RoleName",
                table: "roles",
                newName: "IX_roles_RoleName");

            migrationBuilder.RenameIndex(
                name: "IX_REFRESH_TOKEN_UserID",
                table: "refresh_tokens",
                newName: "IX_refresh_tokens_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_REFRESH_TOKEN_Token",
                table: "refresh_tokens",
                newName: "IX_refresh_tokens_Token");

            migrationBuilder.RenameIndex(
                name: "IX_PASSWORD_RESET_TOKEN_UserID",
                table: "password_reset_tokens",
                newName: "IX_password_reset_tokens_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_PASSWORD_RESET_TOKEN_Token",
                table: "password_reset_tokens",
                newName: "IX_password_reset_tokens_Token");

            migrationBuilder.AddPrimaryKey(
                name: "PK_user_profiles",
                table: "user_profiles",
                column: "ProfileID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_users",
                table: "users",
                column: "UserID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_roles",
                table: "roles",
                column: "RoleID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_refresh_tokens",
                table: "refresh_tokens",
                column: "RefreshTokenID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_password_reset_tokens",
                table: "password_reset_tokens",
                column: "TokenID");

            migrationBuilder.AddForeignKey(
                name: "FK_course_materials_users_UploaderID",
                table: "course_materials",
                column: "UploaderID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_courses_users_ApprovedByID",
                table: "courses",
                column: "ApprovedByID",
                principalTable: "users",
                principalColumn: "UserID");

            migrationBuilder.AddForeignKey(
                name: "FK_courses_users_InstructorID",
                table: "courses",
                column: "InstructorID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_enrollments_users_LearnerID",
                table: "enrollments",
                column: "LearnerID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_password_reset_tokens_users_UserID",
                table: "password_reset_tokens",
                column: "UserID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_users_LearnerID",
                table: "payments",
                column: "LearnerID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_attempts_users_UserID",
                table: "quiz_attempts",
                column: "UserID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quizzes_users_CreatedByID",
                table: "quizzes",
                column: "CreatedByID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_refresh_tokens_users_UserID",
                table: "refresh_tokens",
                column: "UserID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_user_profiles_users_UserID",
                table: "user_profiles",
                column: "UserID",
                principalTable: "users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_roles_RoleID",
                table: "users",
                column: "RoleID",
                principalTable: "roles",
                principalColumn: "RoleID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_course_materials_users_UploaderID",
                table: "course_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_users_ApprovedByID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_courses_users_InstructorID",
                table: "courses");

            migrationBuilder.DropForeignKey(
                name: "FK_enrollments_users_LearnerID",
                table: "enrollments");

            migrationBuilder.DropForeignKey(
                name: "FK_password_reset_tokens_users_UserID",
                table: "password_reset_tokens");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_users_LearnerID",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_quiz_attempts_users_UserID",
                table: "quiz_attempts");

            migrationBuilder.DropForeignKey(
                name: "FK_quizzes_users_CreatedByID",
                table: "quizzes");

            migrationBuilder.DropForeignKey(
                name: "FK_refresh_tokens_users_UserID",
                table: "refresh_tokens");

            migrationBuilder.DropForeignKey(
                name: "FK_user_profiles_users_UserID",
                table: "user_profiles");

            migrationBuilder.DropForeignKey(
                name: "FK_users_roles_RoleID",
                table: "users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_users",
                table: "users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_user_profiles",
                table: "user_profiles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_roles",
                table: "roles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_refresh_tokens",
                table: "refresh_tokens");

            migrationBuilder.DropPrimaryKey(
                name: "PK_password_reset_tokens",
                table: "password_reset_tokens");

            migrationBuilder.RenameTable(
                name: "users",
                newName: "USER");

            migrationBuilder.RenameTable(
                name: "user_profiles",
                newName: "USER_PROFILE");

            migrationBuilder.RenameTable(
                name: "roles",
                newName: "ROLE");

            migrationBuilder.RenameTable(
                name: "refresh_tokens",
                newName: "REFRESH_TOKEN");

            migrationBuilder.RenameTable(
                name: "password_reset_tokens",
                newName: "PASSWORD_RESET_TOKEN");

            migrationBuilder.RenameIndex(
                name: "IX_users_RoleID",
                table: "USER",
                newName: "IX_USER_RoleID");

            migrationBuilder.RenameIndex(
                name: "IX_users_Email",
                table: "USER",
                newName: "IX_USER_Email");

            migrationBuilder.RenameIndex(
                name: "IX_user_profiles_UserID",
                table: "USER_PROFILE",
                newName: "IX_USER_PROFILE_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_roles_RoleName",
                table: "ROLE",
                newName: "IX_ROLE_RoleName");

            migrationBuilder.RenameIndex(
                name: "IX_refresh_tokens_UserID",
                table: "REFRESH_TOKEN",
                newName: "IX_REFRESH_TOKEN_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_refresh_tokens_Token",
                table: "REFRESH_TOKEN",
                newName: "IX_REFRESH_TOKEN_Token");

            migrationBuilder.RenameIndex(
                name: "IX_password_reset_tokens_UserID",
                table: "PASSWORD_RESET_TOKEN",
                newName: "IX_PASSWORD_RESET_TOKEN_UserID");

            migrationBuilder.RenameIndex(
                name: "IX_password_reset_tokens_Token",
                table: "PASSWORD_RESET_TOKEN",
                newName: "IX_PASSWORD_RESET_TOKEN_Token");

            migrationBuilder.AddPrimaryKey(
                name: "PK_USER",
                table: "USER",
                column: "UserID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_USER_PROFILE",
                table: "USER_PROFILE",
                column: "ProfileID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ROLE",
                table: "ROLE",
                column: "RoleID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_REFRESH_TOKEN",
                table: "REFRESH_TOKEN",
                column: "RefreshTokenID");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PASSWORD_RESET_TOKEN",
                table: "PASSWORD_RESET_TOKEN",
                column: "TokenID");

            migrationBuilder.AddForeignKey(
                name: "FK_course_materials_USER_UploaderID",
                table: "course_materials",
                column: "UploaderID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_courses_USER_ApprovedByID",
                table: "courses",
                column: "ApprovedByID",
                principalTable: "USER",
                principalColumn: "UserID");

            migrationBuilder.AddForeignKey(
                name: "FK_courses_USER_InstructorID",
                table: "courses",
                column: "InstructorID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_enrollments_USER_LearnerID",
                table: "enrollments",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PASSWORD_RESET_TOKEN_USER_UserID",
                table: "PASSWORD_RESET_TOKEN",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_USER_LearnerID",
                table: "payments",
                column: "LearnerID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_quiz_attempts_USER_UserID",
                table: "quiz_attempts",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quizzes_USER_CreatedByID",
                table: "quizzes",
                column: "CreatedByID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_REFRESH_TOKEN_USER_UserID",
                table: "REFRESH_TOKEN",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_USER_ROLE_RoleID",
                table: "USER",
                column: "RoleID",
                principalTable: "ROLE",
                principalColumn: "RoleID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_USER_PROFILE_USER_UserID",
                table: "USER_PROFILE",
                column: "UserID",
                principalTable: "USER",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
