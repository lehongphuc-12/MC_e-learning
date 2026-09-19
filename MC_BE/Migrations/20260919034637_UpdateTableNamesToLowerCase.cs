using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTableNamesToLowerCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CERTIFICATE_enrollments_EnrollmentID",
                table: "CERTIFICATE");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CERTIFICATE",
                table: "CERTIFICATE");

            migrationBuilder.RenameTable(
                name: "CERTIFICATE",
                newName: "certificates");

            migrationBuilder.RenameIndex(
                name: "IX_CERTIFICATE_EnrollmentID",
                table: "certificates",
                newName: "IX_certificates_EnrollmentID");

            migrationBuilder.RenameIndex(
                name: "IX_CERTIFICATE_CertificateCode",
                table: "certificates",
                newName: "IX_certificates_CertificateCode");

            migrationBuilder.AddPrimaryKey(
                name: "PK_certificates",
                table: "certificates",
                column: "CertificateID");

            migrationBuilder.AddForeignKey(
                name: "FK_certificates_enrollments_EnrollmentID",
                table: "certificates",
                column: "EnrollmentID",
                principalTable: "enrollments",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_certificates_enrollments_EnrollmentID",
                table: "certificates");

            migrationBuilder.DropPrimaryKey(
                name: "PK_certificates",
                table: "certificates");

            migrationBuilder.RenameTable(
                name: "certificates",
                newName: "CERTIFICATE");

            migrationBuilder.RenameIndex(
                name: "IX_certificates_EnrollmentID",
                table: "CERTIFICATE",
                newName: "IX_CERTIFICATE_EnrollmentID");

            migrationBuilder.RenameIndex(
                name: "IX_certificates_CertificateCode",
                table: "CERTIFICATE",
                newName: "IX_CERTIFICATE_CertificateCode");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CERTIFICATE",
                table: "CERTIFICATE",
                column: "CertificateID");

            migrationBuilder.AddForeignKey(
                name: "FK_CERTIFICATE_enrollments_EnrollmentID",
                table: "CERTIFICATE",
                column: "EnrollmentID",
                principalTable: "enrollments",
                principalColumn: "EnrollmentID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
