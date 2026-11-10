using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddBackgroundMusicTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "background_musics",
                columns: table => new
                {
                    MusicId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AudioUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CloudinaryPublicId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsSystemDefault = table.Column<bool>(type: "boolean", nullable: false),
                    LessonId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_background_musics", x => x.MusicId);
                    table.ForeignKey(
                        name: "FK_background_musics_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "lessons",
                        principalColumn: "LessonID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "background_musics",
                columns: new[] { "MusicId", "AudioUrl", "CloudinaryPublicId", "CreatedAt", "IsSystemDefault", "LessonId", "Title" },
                values: new object[,]
                {
                    { 1, "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227349/background-music/system/lang_man.mp3", "background-music/system/lang_man", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Lãng mạn" },
                    { 2, "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227354/background-music/system/sang_trong.mp3", "background-music/system/sang_trong", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Sang trọng" },
                    { 3, "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227356/background-music/system/soi_dong.mp3", "background-music/system/soi_dong", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Sôi động" },
                    { 4, "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227359/background-music/system/truyen_cam_hung.mp3", "background-music/system/truyen_cam_hung", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Truyền cảm hứng" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_background_musics_LessonId",
                table: "background_musics",
                column: "LessonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "background_musics");
        }
    }
}
