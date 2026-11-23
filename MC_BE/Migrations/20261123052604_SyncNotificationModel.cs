
using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class SyncNotificationModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Tạo bảng notifications
            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    Id = table.Column<long>(
                        type: "bigint",
                        nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),

                    UserId = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    Type = table.Column<string>(
                        type: "character varying(60)",
                        maxLength: 60,
                        nullable: false),

                    Title = table.Column<string>(
                        type: "character varying(250)",
                        maxLength: 250,
                        nullable: false),

                    Message = table.Column<string>(
                        type: "character varying(1000)",
                        maxLength: 1000,
                        nullable: false),

                    Url = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: true),

                    DedupKey = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: true),

                    IsRead = table.Column<bool>(
                        type: "boolean",
                        nullable: false),

                    CreatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_notifications",
                        x => x.Id);
                });

            // 2. Index tối ưu truy vấn thông báo theo người dùng
            migrationBuilder.CreateIndex(
                name: "IX_notifications_UserId_CreatedAt",
                table: "notifications",
                columns: new[] { "UserId", "CreatedAt" }
            );

            // 3. Unique index chống tạo thông báo trùng
            migrationBuilder.CreateIndex(
                name: "IX_notifications_DedupKey",
                table: "notifications",
                column: "DedupKey",
                unique: true,
                filter: "\"DedupKey\" IS NOT NULL"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Xóa bảng notifications khi rollback migration
            migrationBuilder.DropTable(
                name: "notifications");
        }
    }
}
