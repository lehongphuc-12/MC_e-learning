using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableRemedialRetakeCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttemptsGranted",
                table: "remedial_retake_grants",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "AttemptsRemaining",
                table: "remedial_retake_grants",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "RetakeAttemptsGranted",
                table: "remedial_assignments",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttemptsGranted",
                table: "remedial_retake_grants");

            migrationBuilder.DropColumn(
                name: "AttemptsRemaining",
                table: "remedial_retake_grants");

            migrationBuilder.DropColumn(
                name: "RetakeAttemptsGranted",
                table: "remedial_assignments");
        }
    }
}
