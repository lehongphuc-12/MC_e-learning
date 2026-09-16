using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ROLE",
                columns: table => new
                {
                    RoleID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ROLE", x => x.RoleID);
                });

            migrationBuilder.CreateTable(
                name: "USER",
                columns: table => new
                {
                    UserID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleID = table.Column<int>(type: "integer", nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ACTIVE"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USER", x => x.UserID);
                    table.ForeignKey(
                        name: "FK_USER_ROLE_RoleID",
                        column: x => x.RoleID,
                        principalTable: "ROLE",
                        principalColumn: "RoleID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "USER_PROFILE",
                columns: table => new
                {
                    ProfileID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    Bio = table.Column<string>(type: "text", nullable: true),
                    Gender = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: true),
                    ExperienceLevel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    LearningGoal = table.Column<string>(type: "text", nullable: true),
                    PreferredLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "en")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USER_PROFILE", x => x.ProfileID);
                    table.ForeignKey(
                        name: "FK_USER_PROFILE_USER_UserID",
                        column: x => x.UserID,
                        principalTable: "USER",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ROLE_RoleName",
                table: "ROLE",
                column: "RoleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_USER_Email",
                table: "USER",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_USER_RoleID",
                table: "USER",
                column: "RoleID");

            migrationBuilder.CreateIndex(
                name: "IX_USER_PROFILE_UserID",
                table: "USER_PROFILE",
                column: "UserID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "USER_PROFILE");

            migrationBuilder.DropTable(
                name: "USER");

            migrationBuilder.DropTable(
                name: "ROLE");
        }
    }
}
