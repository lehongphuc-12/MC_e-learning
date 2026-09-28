using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceVnPayWithPayOS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VnPayResponseCode",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "VnPayTransactionNo",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "VnPayTransactionStatus",
                table: "payments");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "PAYOS",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "VNPAY");

            migrationBuilder.AlterColumn<string>(
                name: "Provider",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PAYOS",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "VNPAY");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "VNPAY",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "PAYOS");

            migrationBuilder.AddColumn<string>(
                name: "VnPayResponseCode",
                table: "payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VnPayTransactionNo",
                table: "payments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VnPayTransactionStatus",
                table: "payments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Provider",
                table: "payment_transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "VNPAY",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "PAYOS");
        }
    }
}
