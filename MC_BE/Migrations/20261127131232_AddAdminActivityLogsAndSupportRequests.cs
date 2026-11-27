using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminActivityLogsAndSupportRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_activity_logs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ActorUserId = table.Column<int>(type: "integer", nullable: true),
                    ActorName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Summary = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RelatedUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_activity_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_admin_activity_logs_users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "support_requests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PublicCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequesterUserId = table.Column<int>(type: "integer", nullable: false),
                    AssignedAdminId = table.Column<int>(type: "integer", nullable: true),
                    ResolvedByAdminId = table.Column<int>(type: "integer", nullable: true),
                    RelatedCourseId = table.Column<int>(type: "integer", nullable: true),
                    RelatedPaymentId = table.Column<long>(type: "bigint", nullable: true),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Subject = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    ResolutionNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_requests_users_AssignedAdminId",
                        column: x => x.AssignedAdminId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_support_requests_users_RequesterUserId",
                        column: x => x.RequesterUserId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_support_requests_users_ResolvedByAdminId",
                        column: x => x.ResolvedByAdminId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "support_request_messages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupportRequestId = table.Column<long>(type: "bigint", nullable: false),
                    SenderUserId = table.Column<int>(type: "integer", nullable: false),
                    Body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    IsInternalNote = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_request_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_request_messages_support_requests_SupportRequestId",
                        column: x => x.SupportRequestId,
                        principalTable: "support_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_support_request_messages_users_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_activity_logs_ActorUserId_OccurredAt",
                table: "admin_activity_logs",
                columns: new[] { "ActorUserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_admin_activity_logs_EntityType_EntityId",
                table: "admin_activity_logs",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_admin_activity_logs_OccurredAt_Id",
                table: "admin_activity_logs",
                columns: new[] { "OccurredAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_support_request_messages_SenderUserId",
                table: "support_request_messages",
                column: "SenderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_support_request_messages_SupportRequestId_CreatedAt",
                table: "support_request_messages",
                columns: new[] { "SupportRequestId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_support_requests_AssignedAdminId_Status",
                table: "support_requests",
                columns: new[] { "AssignedAdminId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_support_requests_PublicCode",
                table: "support_requests",
                column: "PublicCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_support_requests_RequesterUserId_CreatedAt",
                table: "support_requests",
                columns: new[] { "RequesterUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_support_requests_ResolvedByAdminId",
                table: "support_requests",
                column: "ResolvedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_support_requests_Status_UpdatedAt",
                table: "support_requests",
                columns: new[] { "Status", "UpdatedAt" });

            // These tables are accessed through the authenticated ASP.NET API only.
            // Do not expose ticket contents or admin audit data through Supabase Data API roles.
            migrationBuilder.Sql("ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE public.support_request_messages ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON TABLE public.admin_activity_logs, public.support_requests, public.support_request_messages FROM anon'; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON TABLE public.admin_activity_logs, public.support_requests, public.support_request_messages FROM authenticated'; END IF; END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_activity_logs");

            migrationBuilder.DropTable(
                name: "support_request_messages");

            migrationBuilder.DropTable(
                name: "support_requests");
        }
    }
}
