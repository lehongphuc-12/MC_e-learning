using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using MC_BE.Shared.Data;

#nullable disable

namespace MC_BE.Migrations;

[DbContext(typeof(SmartMcDbContext))]
[Migration("20261019000000_AddQuizPurpose")]
public partial class AddQuizPurpose : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
    name: "Purpose",
            table: "quizzes",
    type: "integer",
    nullable: false,
    defaultValue: 1
);

        migrationBuilder.AddColumn<int>(
            name: "ModuleID",
            table: "quizzes",
            type: "integer",
            nullable: true
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Purpose",
            table: "QUIZ"
        );

        migrationBuilder.DropColumn(
            name: "ModuleID",
            table: "QUIZ"
        );
    }
}