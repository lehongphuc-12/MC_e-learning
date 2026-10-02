using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultChatStickers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "sticker_packs",
                columns: new[] { "StickerPackID", "CreatedAt", "IsActive", "Name", "ThumbnailUrl" },
                values: new object[] { 1, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), true, "Cảm xúc", "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f600.svg" });

            migrationBuilder.InsertData(
                table: "stickers",
                columns: new[] { "StickerID", "CreatedAt", "ImageUrl", "IsActive", "Name", "StickerPackID" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f600.svg", true, "Cười", 1 },
                    { 2, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f602.svg", true, "Cười lớn", 1 },
                    { 3, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f923.svg", true, "Cười ngặt nghẽo", 1 },
                    { 4, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f60d.svg", true, "Yêu", 1 },
                    { 5, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f618.svg", true, "Hôn", 1 },
                    { 6, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f60e.svg", true, "Ngầu", 1 },
                    { 7, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f914.svg", true, "Suy nghĩ", 1 },
                    { 8, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f622.svg", true, "Buồn", 1 },
                    { 9, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f62d.svg", true, "Khóc", 1 },
                    { 10, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f621.svg", true, "Giận", 1 },
                    { 11, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f631.svg", true, "Sốc", 1 },
                    { 12, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f633.svg", true, "Ngại", 1 },
                    { 13, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f975.svg", true, "Nóng", 1 },
                    { 14, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f976.svg", true, "Lạnh", 1 },
                    { 15, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f973.svg", true, "Tiệc", 1 },
                    { 16, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/2764.svg", true, "Tim đỏ", 1 },
                    { 17, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44d.svg", true, "Thích", 1 },
                    { 18, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44e.svg", true, "Không thích", 1 },
                    { 19, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44f.svg", true, "Vỗ tay", 1 },
                    { 20, new DateTime(2026, 9, 24, 0, 0, 0, 0, DateTimeKind.Utc), "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f64c.svg", true, "Ăn mừng", 1 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "sticker_packs",
                keyColumn: "StickerPackID",
                keyValue: 1);
        }
    }
}
