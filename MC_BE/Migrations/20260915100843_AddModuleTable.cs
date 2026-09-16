using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModuleID",
                table: "LESSON",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MODULE",
                columns: table => new
                {
                    ModuleID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MODULE", x => x.ModuleID);
                    table.ForeignKey(
                        name: "FK_MODULE_COURSE_CourseID",
                        column: x => x.CourseID,
                        principalTable: "COURSE",
                        principalColumn: "CourseID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LESSON_ModuleID",
                table: "LESSON",
                column: "ModuleID");

            migrationBuilder.CreateIndex(
                name: "IX_MODULE_CourseID",
                table: "MODULE",
                column: "CourseID");

            migrationBuilder.AddForeignKey(
                name: "FK_LESSON_MODULE_ModuleID",
                table: "LESSON",
                column: "ModuleID",
                principalTable: "MODULE",
                principalColumn: "ModuleID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LESSON_MODULE_ModuleID",
                table: "LESSON");

            migrationBuilder.DropTable(
                name: "MODULE");

            migrationBuilder.DropIndex(
                name: "IX_LESSON_ModuleID",
                table: "LESSON");

            migrationBuilder.DropColumn(
                name: "ModuleID",
                table: "LESSON");
        }
    }
}
