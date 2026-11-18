using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class DiagnoseVoiceModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "voice_ai_entitlements",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "voice_ai_entitlements",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "ACTIVE");
        }
    }
}
