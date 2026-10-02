using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLocalStickerImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "sticker_packs",
                keyColumn: "StickerPackID",
                keyValue: 1,
                column: "ThumbnailUrl",
                value: "/uploads/stickers/default/sticker-01.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 1,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-01.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 2,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-02.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 3,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-03.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 4,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-04.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 5,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-05.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 6,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-06.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 7,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-07.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 8,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-08.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 9,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-09.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 10,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-10.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 11,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-11.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 12,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-12.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 13,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-13.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 14,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-14.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 15,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-15.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 16,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-16.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 17,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-17.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 18,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-18.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 19,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-19.png");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 20,
                column: "ImageUrl",
                value: "/uploads/stickers/default/sticker-20.png");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "sticker_packs",
                keyColumn: "StickerPackID",
                keyValue: 1,
                column: "ThumbnailUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f600.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 1,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f600.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 2,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f602.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 3,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f923.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 4,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f60d.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 5,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f618.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 6,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f60e.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 7,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f914.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 8,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f622.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 9,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f62d.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 10,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f621.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 11,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f631.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 12,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f633.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 13,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f975.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 14,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f976.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 15,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f973.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 16,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/2764.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 17,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44d.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 18,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44e.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 19,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f44f.svg");

            migrationBuilder.UpdateData(
                table: "stickers",
                keyColumn: "StickerID",
                keyValue: 20,
                column: "ImageUrl",
                value: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/1f64c.svg");
        }
    }
}
