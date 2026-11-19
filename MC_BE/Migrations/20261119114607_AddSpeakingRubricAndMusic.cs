using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingRubricAndMusic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BackgroundMusicId",
                table: "speaking_scripts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "speaking_rubric_criteria",
                columns: table => new
                {
                    CriterionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScriptID = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    WeightPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0.00m),
                    IsMandatory = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_speaking_rubric_criteria", x => x.CriterionID);
                    table.ForeignKey(
                        name: "FK_speaking_rubric_criteria_speaking_scripts_ScriptID",
                        column: x => x.ScriptID,
                        principalTable: "speaking_scripts",
                        principalColumn: "ScriptID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_speaking_scripts_BackgroundMusicId",
                table: "speaking_scripts",
                column: "BackgroundMusicId");

            migrationBuilder.CreateIndex(
                name: "IX_speaking_rubric_criteria_ScriptID",
                table: "speaking_rubric_criteria",
                column: "ScriptID");

            migrationBuilder.AddForeignKey(
                name: "FK_speaking_scripts_background_musics_BackgroundMusicId",
                table: "speaking_scripts",
                column: "BackgroundMusicId",
                principalTable: "background_musics",
                principalColumn: "MusicId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_speaking_scripts_background_musics_BackgroundMusicId",
                table: "speaking_scripts");

            migrationBuilder.DropTable(
                name: "speaking_rubric_criteria");

            migrationBuilder.DropIndex(
                name: "IX_speaking_scripts_BackgroundMusicId",
                table: "speaking_scripts");

            migrationBuilder.DropColumn(
                name: "BackgroundMusicId",
                table: "speaking_scripts");
        }
    }
}
